package com.example.rusreact2.services;

import com.example.rusreact2.data.models.Room;
import com.example.rusreact2.repositories.RoomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Service
@RequiredArgsConstructor
public class RoomService {
    private final RoomRepository roomRepository;

    public Flux<Room> findAll() {
        return roomRepository.findAll();
    }

    public Mono<Room> save(Room room) {
        // UUID не устанавливаем вручную: при id=null R2DBC делает INSERT, БД генерирует UUID
        return roomRepository.save(room);
    }

//    public Mono<Room> findById(UUID id) {
//        return roomRepository.findById(id);
//    }
}
