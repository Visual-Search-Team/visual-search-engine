package com.imagesearch.backend_java.batch.repository.impl;

import com.imagesearch.backend_java.batch.dto.request.BatchSearch;
import com.imagesearch.backend_java.batch.entity.BatchEntity;
import com.imagesearch.backend_java.batch.enums.BatchStatus;
import com.imagesearch.backend_java.batch.repository.BatchRepositoryCustom;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import lombok.extern.slf4j.Slf4j;

import java.util.List;

@Slf4j(topic = "BATCH-REPOSITORY")
public class BatchRepositoryCustomImpl implements BatchRepositoryCustom {

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    public List<BatchEntity> getBatches(BatchSearch batchSearch) {
        StringBuilder sql = new StringBuilder("SELECT * FROM batches b");
        StringBuilder where = buildWhereClause(batchSearch);
        sql.append(where);
        sql.append(" ORDER BY b.updated_at DESC");
        sql.append(" LIMIT :limit OFFSET :offset");

        Query query = entityManager.createNativeQuery(sql.toString(), BatchEntity.class);
        setParameters(query, batchSearch);
        query.setParameter("limit", batchSearch.getSize());
        query.setParameter("offset", batchSearch.getOffset());

        log.debug("Executing query: {}", sql);
        return query.getResultList();
    }

    @Override
    public long countBatches(BatchSearch batchSearch) {
        StringBuilder sql = new StringBuilder("SELECT COUNT(*) FROM batches b");
        StringBuilder where = buildWhereClause(batchSearch);
        sql.append(where);

        Query query = entityManager.createNativeQuery(sql.toString());
        setParameters(query, batchSearch);

        log.debug("Executing count query: {}", sql);
        return ((Number) query.getSingleResult()).longValue();
    }

    private StringBuilder buildWhereClause(BatchSearch batchSearch) {
        StringBuilder where = new StringBuilder(" WHERE b.status != 'DELETED'");

        if (batchSearch.getStatus() != null) {
            where.append(" AND b.status = :status");
        }
        if (batchSearch.getName() != null && !batchSearch.getName().isBlank()) {
            where.append(" AND b.name LIKE :name");
        }
        addDateFilter(where, batchSearch);

        return where;
    }

    private void addDateFilter(StringBuilder where, BatchSearch batchSearch) {
        if (batchSearch.getToDate() != null && batchSearch.getFromDate() != null) {
            where.append(" AND b.updated_at BETWEEN :fromDate AND :toDate");
        } else if (batchSearch.getFromDate() != null) {
            where.append(" AND b.updated_at >= :fromDate");
        } else if (batchSearch.getToDate() != null) {
            where.append(" AND b.updated_at <= :toDate");
        }
    }

    private void setParameters(Query query, BatchSearch batchSearch) {
        if (batchSearch.getName() != null && !batchSearch.getName().isBlank()) {
            query.setParameter("name", "%" + batchSearch.getName() + "%");
        }
        if (batchSearch.getStatus() != null) {
            query.setParameter("status", batchSearch.getStatus().name());
        }
        if (batchSearch.getFromDate() != null) {
            query.setParameter("fromDate", batchSearch.getFromDate().atStartOfDay());
        }
        if (batchSearch.getToDate() != null) {
            query.setParameter("toDate", batchSearch.getToDate().atTime(23, 59, 59));
        }
    }
}
