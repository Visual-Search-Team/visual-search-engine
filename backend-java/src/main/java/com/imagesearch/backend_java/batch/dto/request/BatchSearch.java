package com.imagesearch.backend_java.batch.dto.request;

import com.imagesearch.backend_java.batch.enums.BatchStatus;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class BatchSearch {
    private String name;
    private BatchStatus status;
    private LocalDate fromDate;
    private LocalDate toDate;
}
