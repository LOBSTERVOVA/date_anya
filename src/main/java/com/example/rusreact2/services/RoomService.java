package com.example.rusreact2.services;

import com.example.rusreact2.data.models.Room;
import com.example.rusreact2.repositories.RoomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RoomService {
    private final RoomRepository roomRepository;

    public Flux<Room> findAll() {
        return roomRepository.findAll();
    }

//    public Mono<Room> findById(UUID id) {
//        return roomRepository.findById(id);
//    }
}
