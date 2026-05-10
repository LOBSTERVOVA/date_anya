package com.example.rusreact2.data.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ClubPageDto {
    private List<ClubDto> content;
    private long totalElements;
    private int totalPages;
    private int page;
    private int size;
}
