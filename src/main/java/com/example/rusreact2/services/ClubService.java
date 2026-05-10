package com.example.rusreact2.services;

import com.example.rusreact2.data.dto.ClubDto;
import com.example.rusreact2.data.dto.ClubScheduleDto;
import com.example.rusreact2.data.dto.RoomDto;
import com.example.rusreact2.data.models.Club;
import com.example.rusreact2.data.models.ClubSchedule;
import com.example.rusreact2.data.dto.ClubPageDto;
import com.example.rusreact2.repositories.ClubRepository;
import com.example.rusreact2.repositories.ClubScheduleRepository;
import com.example.rusreact2.repositories.DepartmentRepository;
import com.example.rusreact2.repositories.RoomRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ClubService {

    private final ClubRepository clubRepository;
    private final ClubScheduleRepository scheduleRepository;
    private final RoomRepository roomRepository;
    private final DepartmentRepository departmentRepository;

    public Flux<ClubDto> findByDepartment(UUID departmentUuid) {
        return clubRepository.findByDepartmentUuid(departmentUuid)
                .flatMap(this::enrichWithSchedules)
                .flatMap(this::toDto);
    }

    /**
     * Пагинированный список клубов/секций по типу с поиском и фильтрами.
     * @param type SPORTS_CLUB или SCIENCE_CLUB
     * @param page номер страницы (0-based)
     * @param size размер страницы
     * @param search поиск по названию и описанию (null — без фильтра)
     * @param dayOfWeek фильтр по дню недели 1-7 (null — без фильтра)
     * @param timeFrom фильтр «занятие не раньше» HH:MM (null — без фильтра)
     * @param timeTo фильтр «занятие не позже» HH:MM (null — без фильтра)
     */
    public Mono<ClubPageDto> findAllByType(String type, int page, int size,
                                            String search, Integer dayOfWeek,
                                            String timeFrom, String timeTo) {
        long offset = (long) page * size;
        Mono<Long> totalMono = clubRepository.countByTypeWithFilters(type, search, dayOfWeek, timeFrom, timeTo);
        Flux<ClubDto> contentFlux = clubRepository.findByTypeWithFilters(type, search, dayOfWeek, timeFrom, timeTo, size, offset)
                .flatMap(this::enrichWithSchedules)
                .flatMap(this::toDto);

        return Mono.zip(contentFlux.collectList(), totalMono)
                .map(tuple -> {
                    List<ClubDto> content = tuple.getT1();
                    long total = tuple.getT2();
                    int totalPages = size > 0 ? (int) Math.ceil((double) total / size) : 0;
                    return new ClubPageDto(content, total, totalPages, page, size);
                });
    }

    public Mono<ClubDto> findById(UUID uuid) {
        return clubRepository.findById(uuid)
                .switchIfEmpty(Mono.error(new ResponseStatusException(HttpStatus.NOT_FOUND, "Клуб не найден")))
                .flatMap(this::enrichWithSchedules)
                .flatMap(this::toDto);
    }

    public Mono<ClubDto> create(Club club, List<ClubSchedule> schedules) {
        // UUID не устанавливаем вручную: при id=null R2DBC делает INSERT, БД генерирует UUID
        if (club.getType() == null) club.setType("SCIENCE_CLUB");
        if (club.getRoomUuids() == null) club.setRoomUuids(new HashSet<>());

        return clubRepository.save(club)
                .flatMap(saved -> {
                    if (schedules != null && !schedules.isEmpty()) {
                        schedules.forEach(s -> s.setClubUuid(saved.getUuid()));
                        // UUID расписаний тоже не устанавливаем — R2DBC сделает INSERT
                        return scheduleRepository.saveAll(schedules).collectList().thenReturn(saved);
                    }
                    return Mono.just(saved);
                })
                .flatMap(saved -> enrichWithSchedules(saved).flatMap(this::toDto));
    }

    public Mono<ClubDto> update(UUID uuid, Club club, List<ClubSchedule> schedules) {
        return clubRepository.findById(uuid)
                .switchIfEmpty(Mono.error(new ResponseStatusException(HttpStatus.NOT_FOUND, "Клуб не найден")))
                .flatMap(existing -> {
                    existing.setName(club.getName());
                    existing.setType(club.getType());
                    existing.setAvatar(club.getAvatar());
                    existing.setDescription(club.getDescription());
                    existing.setRoomUuids(club.getRoomUuids() != null ? club.getRoomUuids() : new HashSet<>());

                    return clubRepository.save(existing)
                            .flatMap(saved -> scheduleRepository.deleteByClubUuid(uuid)
                                    .then(Mono.defer(() -> {
                                        if (schedules != null && !schedules.isEmpty()) {
                                            schedules.forEach(s -> s.setClubUuid(uuid));
                                            // UUID не устанавливаем — R2DBC сделает INSERT для новых записей
                                            return scheduleRepository.saveAll(schedules).collectList().thenReturn(saved);
                                        }
                                        return Mono.just(saved);
                                    })));
                })
                .flatMap(saved -> enrichWithSchedules(saved).flatMap(this::toDto));
    }

    public Mono<Void> delete(UUID uuid) {
        return scheduleRepository.deleteByClubUuid(uuid)
                .then(clubRepository.deleteById(uuid));
    }

    private Mono<Club> enrichWithSchedules(Club club) {
        return scheduleRepository.findByClubUuid(club.getUuid())
                .collectList()
                .map(schedules -> {
                    club.setSchedules(schedules);
                    return club;
                });
    }

    private Mono<ClubDto> toDto(Club club) {
        ClubDto dto = new ClubDto();
        dto.setUuid(club.getUuid());
        dto.setName(club.getName());
        dto.setType(club.getType());
        dto.setAvatar(club.getAvatar());
        dto.setDescription(club.getDescription());
        dto.setRoomUuids(club.getRoomUuids());
        dto.setDepartmentUuid(club.getDepartmentUuid());

        Mono<ClubDto> dtoMono;
        if (club.getRoomUuids() != null && !club.getRoomUuids().isEmpty()) {
            dtoMono = roomRepository.findAllById(club.getRoomUuids())
                    .collectList()
                    .map(rooms -> {
                        Set<RoomDto> roomDtos = rooms.stream().map(r -> {
                            RoomDto rd = new RoomDto();
                            rd.setUuid(r.getUuid());
                            rd.setTitle(r.getTitle());
                            return rd;
                        }).collect(Collectors.toSet());
                        dto.setRooms(roomDtos);
                        return dto;
                    });
        } else {
            dto.setRooms(new HashSet<>());
            dtoMono = Mono.just(dto);
        }

        // Обогащаем названием кафедры
        Mono<ClubDto> withDeptName = dtoMono.flatMap(d -> {
            if (club.getDepartmentUuid() != null) {
                return departmentRepository.findById(club.getDepartmentUuid())
                        .map(dept -> {
                            d.setDepartmentName(dept.getName());
                            return d;
                        })
                        .defaultIfEmpty(d);
            }
            return Mono.just(d);
        });

        return withDeptName.map(d -> {
            if (club.getSchedules() != null) {
                d.setSchedules(club.getSchedules().stream().map(s -> {
                    ClubScheduleDto sd = new ClubScheduleDto();
                    sd.setUuid(s.getUuid());
                    sd.setClubUuid(s.getClubUuid());
                    sd.setDayOfWeek(s.getDayOfWeek());
                    sd.setStartTime(s.getStartTime());
                    sd.setEndTime(s.getEndTime());
                    return sd;
                }).collect(Collectors.toList()));
            } else {
                d.setSchedules(new ArrayList<>());
            }
            return d;
        });
    }
}
