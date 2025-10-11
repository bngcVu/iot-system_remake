package com.iot_system.util;

import com.iot_system.domain.dto.PagedResponse;
import org.springframework.data.domain.Page;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.function.Function;
import java.util.stream.IntStream;

/**
 * Tiện ích chuyển đổi dữ liệu phản hồi (Page -> PagedResponse)
 */
public class ResponseUtils {
    
    private static final Logger log = LoggerFactory.getLogger(ResponseUtils.class);
    
    /**
     * Phương thức tổng quát để chuyển Page<T> -> PagedResponse<R>
     * @param page Spring Data Page
     * @param pageNumber số trang hiện tại
     * @param pageSize kích thước trang
     * @param message thông điệp thành công
     * @param mapper hàm ánh xạ entity -> DTO
     * @param emptyMessage thông điệp khi không có dữ liệu
     * @return PagedResponse<R>
     */
    public static <T, R> PagedResponse<R> mapToPagedResponse(Page<T> page, 
                                                           int pageNumber, 
                                                           int pageSize, 
                                                           String message,
                                                           Function<T, R> mapper,
                                                           String emptyMessage) {
        List<R> results = IntStream.range(0, page.getContent().size())
                .mapToObj(i -> {
                    T entity = page.getContent().get(i);
                    R dto = mapper.apply(entity);
                    log.debug("Mapped entity to DTO: {}", dto);
                    return dto;
                })
                .toList();

        log.info("Mapped {} records to DTOs", results.size());

        if (results.isEmpty()) {
            return new PagedResponse<>(emptyMessage, results,
                    pageNumber, pageSize, page.getTotalElements(), page.getTotalPages());
        }

        return new PagedResponse<>(message, results,
                pageNumber, pageSize, page.getTotalElements(), page.getTotalPages());
    }
}
