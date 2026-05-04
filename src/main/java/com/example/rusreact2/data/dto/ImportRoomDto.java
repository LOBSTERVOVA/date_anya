package com.example.rusreact2.data.dto;

import com.opencsv.bean.CsvBindByPosition;
import lombok.Data;

@Data
public class ImportRoomDto {
    @CsvBindByPosition(position = 0)
    String room;
}
