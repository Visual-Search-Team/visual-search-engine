package com.imagesearch.backend_java.batch.converter;

import com.imagesearch.backend_java.batch.dto.request.BatchSearch;
import com.imagesearch.backend_java.batch.enums.BatchStatus;
import com.imagesearch.backend_java.utils.MapUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.Map;

@Component
@Slf4j(topic = "BATCH-SEARCH-CONVERTER")
public class BatchSearchConverter {
    public BatchSearch toBatchSearch(Map<String, Object> params) {
        log.debug("Converting params to BatchSearch: {}", params);
        BatchSearch batchSearch = BatchSearch.builder()
                .name(MapUtil.convertMap(params, "name", String.class))
                .status(MapUtil.convertMap(params, "status", BatchStatus.class))
                .fromDate(MapUtil.convertMap(params, "fromDate", LocalDate.class))
                .toDate(MapUtil.convertMap(params, "toDate", LocalDate.class))
                .page(MapUtil.convertMap(params, "page", Integer.class))
                .size(MapUtil.convertMap(params, "size", Integer.class))
                .build();
        log.debug("BatchSearch created - page: {}, size: {}, name: {}, status: {}", 
                batchSearch.getPage(), batchSearch.getSize(), batchSearch.getName(), batchSearch.getStatus());
        return batchSearch;
    }
}

