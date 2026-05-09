package com.example.rusreact2.controllers.rest;

import com.example.rusreact2.data.dto.RoomDto;
import com.example.rusreact2.data.models.Pair;
import com.example.rusreact2.data.models.Room;
import com.example.rusreact2.services.PairService;
import com.example.rusreact2.services.RoomService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/room")
public class RoomController {

    private final RoomService roomService;
    private final PairService pairService;

    @GetMapping
    public Flux<Room> getAllRooms() {
        return roomService.findAll();
    }

    @PostMapping
    public Mono<Room> create(@RequestBody Room room) {
        log.info("create room: title={}", room.getTitle());
        return roomService.save(room);
    }

//    @GetMapping("/free")
//    public Flux<RoomDto> getFreeRooms(
//            @RequestParam LocalDate date,
//            @RequestParam int pairOrder
//    ) {
//        // Получаем Set UUID занятых аудиторий (кэшируем, чтобы не запрашивать для каждой комнаты)
//        Mono<Set<UUID>> occupiedRoomUuids = pairService
//                .getPairsByDateAndPairOrder(date, pairOrder)
//                .map(Pair::getRoomUuid)
//                .filter(Objects::nonNull)
//                .collect(Collectors.toSet())
//                .cache(); // Важно: вычисляем один раз, а не на каждый элемент потока
//
//        // Возвращаем только свободные аудитории
//        return roomService.findAll()
//                .filterWhen(room ->
//                        occupiedRoomUuids.map(occupiedSet -> !occupiedSet.contains(room.getUuid()))
//                )
//                .map(room -> new RoomDto(room.getUuid(), room.getTitle())); // Возвращаем DTO
//    }

}
