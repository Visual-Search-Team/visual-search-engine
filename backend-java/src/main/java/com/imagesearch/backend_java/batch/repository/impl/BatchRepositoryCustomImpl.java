package com.imagesearch.backend_java.batch.repository.impl;

import com.imagesearch.backend_java.batch.dto.request.BatchSearch;
import com.imagesearch.backend_java.batch.dto.response.BatchSummaryResponse;
import com.imagesearch.backend_java.batch.entity.BatchEntity;
import com.imagesearch.backend_java.batch.enums.BatchStatus;
import com.imagesearch.backend_java.batch.repository.BatchRepositoryCustom;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import lombok.RequiredArgsConstructor;

import java.util.List;
public class BatchRepositoryCustomImpl implements BatchRepositoryCustom {

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    public List<BatchEntity> getBatches(BatchSearch batchSearch) {
        StringBuilder sql = new StringBuilder("SELECT * FROM batches b");
        StringBuilder where = new StringBuilder(" WHERE b.status != 'DELETED' " );
        if(batchSearch.getStatus() != null){
            where.append(" AND b.status = :status ");
        }
        if(batchSearch.getName() != null){
            where.append(" AND b.name like :name ");
        }
        queryByDate(where, batchSearch);
        sql.append(where);
        Query query = entityManager.createNativeQuery(sql.toString(), BatchEntity.class);
        setParameter(query, batchSearch);
        return query.getResultList();
    }

    private void queryByDate(StringBuilder where, BatchSearch batchSearch) {
        if(batchSearch.getToDate() != null && batchSearch.getFromDate() != null){
            where.append(" AND b.updated_at BETWEEN :fromDate AND :toDate ");
        }
        else if(batchSearch.getFromDate() != null){
            where.append(" AND b.updated_at >= :fromDate ");
        }
        else if(batchSearch.getToDate() != null){
            where.append(" AND b.updated_at <= :toDate ");
        }
    }


    private void setParameter(Query query, BatchSearch batchSearch) {
//        query.setParameter("deleteStatus", BatchStatus.DELETED.ordinal());
        if(batchSearch.getName() != null){
            query.setParameter("name", "%" + batchSearch.getName() + "%");
        }
        if(batchSearch.getStatus() != null){
            query.setParameter("status", batchSearch.getStatus().name());
        }
        if(batchSearch.getFromDate() != null){
            query.setParameter("fromDate", batchSearch.getFromDate().atStartOfDay());
        }
        if(batchSearch.getToDate() != null){
            query.setParameter("toDate", batchSearch.getToDate().atTime(23, 59, 59));
        }
    }

}
