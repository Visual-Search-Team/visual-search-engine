package com.imagesearch.backend_java.batch.dto.request;

import com.imagesearch.backend_java.batch.enums.BatchStatus;
import lombok.*;

import java.time.LocalDate;

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
    private Integer page;
    private Integer size;

    public int getPage() {
        return page != null ? page : 0;
    }

    public int getSize() {
        return size != null ? size : 20;
    }

    public int getOffset() {
        return getPage() * getSize();
    }
}
