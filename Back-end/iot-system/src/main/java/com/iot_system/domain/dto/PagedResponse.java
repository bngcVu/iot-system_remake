package com.iot_system.domain.dto;

import java.util.List;


public class PagedResponse<T> {
    private String message;
    private List<T> data;
    private int currentPage;
    private int pageSize;
    private long totalElements;
    private int totalPages;

    public PagedResponse(String message, List<T> data, int currentPage, int pageSize, long totalElements,
            int totalPages) {
        this.message = message;
        this.data = data;
        this.currentPage = currentPage;
        this.pageSize = pageSize;
        this.totalElements = totalElements;
        this.totalPages = totalPages;
    }

    public String getMessage() {
        return message;
    }

    public List<T> getData() {
        return data;
    }

    public int getCurrentPage() {
        return currentPage;
    }

    public int getPageSize() {
        return pageSize;
    }

    public long getTotalElements() {
        return totalElements;
    }

    public int getTotalPages() {
        return totalPages;
    }
}
