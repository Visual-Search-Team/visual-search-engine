package com.imagesearch.backend_java.index.converter;

import com.imagesearch.backend_java.batch.dto.PageableRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
@RequiredArgsConstructor
public class IndexingJobSearchConverter {

    public PageableRequest toPageableRequest(Map<String, Object> params) {
        Integer page = params.containsKey("page") ? 
            Integer.parseInt(params.get("page").toString()) : 0;
        Integer size = params.containsKey("size") ? 
            Integer.parseInt(params.get("size").toString()) : 10;

        return PageableRequest.builder()
                .page(page)
                .size(size)
                .build();
    }
}
