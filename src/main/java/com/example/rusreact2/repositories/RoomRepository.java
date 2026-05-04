package com.example.rusreact2.repositories;

import com.example.rusreact2.data.models.Room;
import org.springframework.data.r2dbc.repository.R2dbcRepository;

import java.util.UUID;

public interface RoomRepository extends R2dbcRepository<Room, UUID> {

}
