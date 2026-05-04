package com.example.rusreact2.data.dto;

import com.opencsv.bean.CsvBindByPosition;
import lombok.Data;

@Data
public class ImportLecturerDto {
    @CsvBindByPosition(position = 0)
    private String fio;

    @CsvBindByPosition(position = 1)
    private String code;

    @CsvBindByPosition(position = 2)
    private String department;

    @CsvBindByPosition(position = 3)
    private String department_code;
}
