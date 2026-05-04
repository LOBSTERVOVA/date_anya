package com.example.rusreact2.services;

import com.example.rusreact2.data.dto.DepartmentDto;
import com.example.rusreact2.data.dto.LecturerDto;
import com.example.rusreact2.repositories.DepartmentRepository;
import com.example.rusreact2.repositories.LecturerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

@Service
@RequiredArgsConstructor
public class LecturerService {
    private final LecturerRepository lecturerRepository;
    private final DepartmentRepository departmentRepository;

    public Flux<LecturerDto> search(String q) {
        return lecturerRepository.search(q)
                .flatMap(lecturer ->
                        departmentRepository.findById(lecturer.getDepartmentUuid())
                                .map(department -> new LecturerDto().fullLecturerDto(
                                        lecturer,
                                        new DepartmentDto().minimumDepartmentDto(department))
                                )
                );
    }

}
