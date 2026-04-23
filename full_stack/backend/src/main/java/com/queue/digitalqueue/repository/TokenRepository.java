package com.queue.digitalqueue.repository;

import com.queue.digitalqueue.entity.ServiceType;
import com.queue.digitalqueue.entity.Token;
import com.queue.digitalqueue.entity.TokenStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TokenRepository extends JpaRepository<Token, Long> {

    List<Token> findAllByOrderByCreatedTimeAsc();

    Optional<Token> findTopByOrderByTokenNumberDesc();

    List<Token> findByStatusOrderByCreatedTimeAsc(TokenStatus status);

    List<Token> findByStatusAndServiceTypeOrderByCreatedTimeAsc(TokenStatus status, ServiceType serviceType);

    Optional<Token> findTopByStatusOrderByServedTimeDesc(TokenStatus status);

    Optional<Token> findTopByStatusAndServiceTypeOrderByServedTimeDesc(TokenStatus status, ServiceType serviceType);

    List<Token> findByStatusOrderByServedTimeDesc(TokenStatus status);

    Optional<Token> findTopByNameIgnoreCaseOrderByCreatedTimeDesc(String name);

    Optional<Token> findByTokenNumber(int tokenNumber);

    long countByStatus(TokenStatus status);
}
