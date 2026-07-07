package com.imagesearch.backend_java.batch.converter;

import com.imagesearch.backend_java.batch.dto.request.BatchSearch;
import com.imagesearch.backend_java.batch.enums.BatchStatus;
import com.imagesearch.backend_java.utils.MapUtil;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.Map;

@Component
public class BatchSearchConverter {
    public BatchSearch toBatchSearch(Map<String, Object> params){
        return BatchSearch.builder()
                .name(MapUtil.convertMap(params, "name", String.class))
                .status(MapUtil.convertMap(params, "status", BatchStatus.class))
                .fromDate(MapUtil.convertMap(params, "fromDate", LocalDate.class))
                .toDate(MapUtil.convertMap(params, "toDate", LocalDate.class))
                .build();
    }
}
