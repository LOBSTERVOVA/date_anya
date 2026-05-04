package com.example.rusreact2.data.dto;

import com.opencsv.bean.CsvBindByPosition;
import lombok.Data;

@Data
public class ImportPlanDto {
    @CsvBindByPosition(position = 0)
    private String groupName;          // group_name

    @CsvBindByPosition(position = 1)
    private String externalId;         // external_id

    @CsvBindByPosition(position = 2)
    private String discipline;         // discipline

    @CsvBindByPosition(position = 3)
    private String term;               // term

    @CsvBindByPosition(position = 4)
    private String pairKind;           // pair_kind

    @CsvBindByPosition(position = 5)
    private String hours;              // hours

    @CsvBindByPosition(position = 6)
    private String departmentName;     // department_name

    @CsvBindByPosition(position = 7)
    private String educationForm;      // форму обучения нужно парсить в enum

    @CsvBindByPosition(position = 8)
    private String faculty;

    @CsvBindByPosition(position = 9)
    private String direction;          // например спорт или фк

    @CsvBindByPosition(position = 10)
    private int course;

    @CsvBindByPosition(position = 11)
    private String specialization;     // специализация(может включать несколько видов спорта)

    @CsvBindByPosition(position = 12)
    private String kindOfSport;
}
