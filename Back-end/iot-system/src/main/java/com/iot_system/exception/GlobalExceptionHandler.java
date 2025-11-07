package com.iot_system.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseBody;

@ControllerAdvice(basePackages = "com.iot_system")
public class GlobalExceptionHandler {

    

    // Bắt lỗi validate request
    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseBody
    public ResponseEntity<Object> handleValidation(MethodArgumentNotValidException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse("VALIDATION_ERROR", "Yêu cầu không hợp lệ", "Validation failed"));
    }

    @ExceptionHandler(InvalidDateFormatException.class)
    @ResponseBody
    public ResponseEntity<Object> handleInvalidDate(InvalidDateFormatException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse("INVALID_DATE_FORMAT", "Sai định dạng ngày/giờ", ex.getMessage()));
    }

    static class ErrorResponse {
        public final String code;
        public final String message;
        public final String details;
        ErrorResponse(String code, String message, String details) {
            this.code = code;
            this.message = message;
            this.details = details;
        }
    }
}
