package com.iot_system.service;

import com.iot_system.domain.dto.PagedResponse;
import com.iot_system.domain.dto.SensorReadingDTO;
import com.iot_system.domain.entity.Device;
import com.iot_system.domain.entity.SensorData;
import com.iot_system.domain.enums.SensorMetric;
import com.iot_system.repository.SensorDataRepository;
import com.iot_system.util.DateTimeUtils;
import com.iot_system.exception.InvalidDateFormatException;
import com.iot_system.util.ResponseUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.data.jpa.domain.Specification;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDateTime;
import jakarta.persistence.criteria.Predicate;

@Service
public class SensorDataService {

    private static final Logger log = LoggerFactory.getLogger(SensorDataService.class);

    private final SensorDataRepository sensorRepo;

    public SensorDataService(SensorDataRepository sensorRepo) {
        this.sensorRepo = sensorRepo;
    }

    
    //Lưu một bản ghi dữ liệu cảm biến vào csdl (ghi thời điểm hiện tại)
    
    public SensorData saveSensorData(Device device, Double temperature, Double humidity, Double light) {
        SensorData data = new SensorData();
        data.setDevice(device);
        data.setTemperature(temperature);
        data.setHumidity(humidity);
        data.setLight(light);
        data.setRecordedAt(LocalDateTime.now());
        return sensorRepo.save(data);
    }

    /**
     * Tìm kiếm theo thời gian (có phân trang) với nhiều định dạng ngày/giờ.
     * Hỗ trợ các định dạng: 
     *          HH:mm:ss dd/MM/yyyy, 
     *          dd-MM-yyyy HH:mm:ss, 
     *          dd-MM-yyyy HH:mm, 
     *          ddMMyyyy, 
     *          dd/MM/yyyy, 
     *          ddMMyy
     */
    public PagedResponse<SensorReadingDTO> search(String dateStr, SensorMetric metric, int page, int size, String sort) {
        LocalDateTime start = null;
        LocalDateTime end = null;
        String searchMessage = "";

        if (dateStr != null && !dateStr.isBlank()) {
            // Parse theo các định dạng hỗ trợ; trả về start/end tương ứng
            DateTimeUtils.DateTimeParseResult parseResult = DateTimeUtils.parseDateTime(dateStr);
            
            if (parseResult != null) {
                if (parseResult.isExactMatch()) {
                    // Trùng chính xác tới giây
                    start = parseResult.getStart();
                    end = parseResult.getEnd();
                    searchMessage = "Tìm thấy kết quả chính xác cho " + dateStr;
                } else {
                    // Trùng theo phút (khoảng 1 phút)
                    start = parseResult.getStart();
                    end = parseResult.getEnd();
                    searchMessage = "Tìm thấy kết quả trong phút " + dateStr;
                }
            } else {
                throw new InvalidDateFormatException("Hỗ trợ: dd-MM-yyyy HH:mm:ss, dd-MM-yyyy HH:mm, dd-MM-yyyy, ddMMyyyy, dd/MM/yyyy, ddMMyy");
            }
        }

    // Gọi repository JPQL search(...) + sắp xếp theo Pageable
        Page<SensorData> sensorPage = sensorRepo.search(start, end, metric != null ? metric.name() : "ALL", PageRequest.of(page, size,
                ("asc".equalsIgnoreCase(sort))
                        ? Sort.by("recordedAt").ascending()
                        : Sort.by("recordedAt").descending()
        ));

        int startIndex = page * size;
        return ResponseUtils.mapToPagedResponse(sensorPage, page, size,
                (start != null)
                        ? searchMessage + " (" + sensorPage.getContent().size() + " kết quả)"
                        : "Tìm thấy " + sensorPage.getContent().size() + " kết quả.",
                data -> {
                    int index = sensorPage.getContent().indexOf(data);
                    return SensorReadingDTO.from(data, startIndex + index + 1);
                },
                "Không tìm thấy dữ liệu cảm biến.");
    }

    public PagedResponse<SensorReadingDTO> searchByValue(String dateStr,
                                                         SensorMetric metric,
                                                         String valueOp,
                                                         Double value,
                                                         int page,
                                                         int size,
                                                         String sort) {
        LocalDateTime start = null;
        LocalDateTime end = null;
        if (dateStr != null && !dateStr.isBlank()) {
            DateTimeUtils.DateTimeParseResult parseResult = DateTimeUtils.parseDateTime(dateStr);
            if (parseResult == null) {
                throw new InvalidDateFormatException("Hỗ trợ: dd-MM-yyyy HH:mm:ss, dd-MM-yyyy HH:mm, dd-MM-yyyy, ddMMyyyy, dd/MM/yyyy, ddMMyy");
            }
            start = parseResult.getStart();
            end = parseResult.getEnd();
        }

    // Trường hợp đặc biệt: metric = ALL => khớp giá trị ở bất kỳ cột nào (OR)
        if (metric == SensorMetric.ALL) {
            if (value == null) {
                throw new IllegalArgumentException("Cần truyền 'value' khi tìm kiếm ở chế độ ALL");
            }
            if (valueOp != null && !valueOp.equalsIgnoreCase("eq")) {
                throw new IllegalArgumentException("Chế độ ALL chỉ hỗ trợ so sánh tuyệt đối (eq)");
            }

            final LocalDateTime startTime2 = start;
            final LocalDateTime endTime2 = end;
            final Double v = value;
            // Dùng tolerance nhỏ để tránh sai số số thực khi so sánh bằng tuyệt đối (DOUBLE)
            final double tol = 0.05d;

            Specification<SensorData> specAll = (root, query, cb) -> {
                var predicate = cb.conjunction();
                if (startTime2 != null) {
                    predicate = cb.and(predicate, cb.greaterThanOrEqualTo(root.get("recordedAt"), startTime2));
                }
                if (endTime2 != null) {
                    predicate = cb.and(predicate, cb.lessThan(root.get("recordedAt"), endTime2));
                }
                // OR: bất kỳ cột nào (temperature/humidity/light) xấp xỉ bằng giá trị (±tol)
                var orPredicate = cb.or(
                        cb.between(root.get("temperature"), v - tol, v + tol),
                        cb.between(root.get("humidity"), v - tol, v + tol),
                        cb.between(root.get("light"), v - tol, v + tol)
                );
                return cb.and(predicate, orPredicate);
            };

            Page<SensorData> sensorPage = sensorRepo.findAll(specAll, PageRequest.of(page, size,
                    ("asc".equalsIgnoreCase(sort))
                            ? Sort.by("recordedAt").ascending()
                            : Sort.by("recordedAt").descending()
            ));

            int startIndex = page * size;
            return ResponseUtils.mapToPagedResponse(sensorPage, page, size,
                    "Tìm theo giá trị (ALL) thành công",
                    data -> {
                        int index = sensorPage.getContent().indexOf(data);
                        return SensorReadingDTO.from(data, startIndex + index + 1);
                    },
                    "Không tìm thấy dữ liệu cảm biến.");
        }

        // Các trường hợp còn lại: lọc theo một cảm biến cụ thể với toán tử 'eq'
        if (valueOp == null || valueOp.isBlank()) {
            valueOp = "eq";
        }
        if (!"eq".equalsIgnoreCase(valueOp)) {
            throw new IllegalArgumentException("Chỉ hỗ trợ so sánh giá trị tuyệt đối (eq)");
        }
        if (value == null) {
            throw new IllegalArgumentException("Cần cung cấp giá trị để so sánh");
        }

        final LocalDateTime startTime = start;
        final LocalDateTime endTime = end;
        final SensorMetric metricFinal = metric;
        final Double v = value;
        final double tol = 0.05d; // đồng bộ với nhánh ALL để tránh sai số số thực

        Specification<SensorData> spec = (root, query, cb) -> {
            Predicate predicate = cb.conjunction();
            if (startTime != null) {
                predicate = cb.and(predicate, cb.greaterThanOrEqualTo(root.get("recordedAt"), startTime));
            }
            if (endTime != null) {
                predicate = cb.and(predicate, cb.lessThan(root.get("recordedAt"), endTime));
            }
            if (metricFinal != null && metricFinal != SensorMetric.ALL) {
                String field = resolveField(metricFinal);
                // So sánh xấp xỉ bằng (±tol) để ổn định trước sai số Double
                predicate = cb.and(predicate, cb.between(root.get(field), v - tol, v + tol));
            }
            return predicate;
        };

        Page<SensorData> sensorPage = sensorRepo.findAll(spec, PageRequest.of(page, size,
                ("asc".equalsIgnoreCase(sort))
                        ? Sort.by("recordedAt").ascending()
                        : Sort.by("recordedAt").descending()
        ));

        int startIndex = page * size;
        return ResponseUtils.mapToPagedResponse(sensorPage, page, size,
                "Tìm theo giá trị thành công",
                data -> {
                    int index = sensorPage.getContent().indexOf(data);
                    return SensorReadingDTO.from(data, startIndex + index + 1);
                },
                "Không tìm thấy dữ liệu cảm biến.");
    }

    private String resolveField(SensorMetric metric) {
        switch (metric) {
            case TEMP: return "temperature";
            case HUMIDITY: return "humidity";
            case LIGHT: return "light";
            default: return null;
        }
    }



    // Lấy toàn bộ dữ liệu cảm biến (có phân trang), có thể lọc theo metric != ALL
    public PagedResponse<SensorReadingDTO> getAllData(SensorMetric metric, int page, int size, String sort) {
        log.info("Getting all sensor data - page: {}, size: {}, sort: {}", page, size, sort);
        
        Page<SensorData> sensorPage = sensorRepo.search(null, null, metric != null ? metric.name() : "ALL", PageRequest.of(page, size,
                ("asc".equalsIgnoreCase(sort))
                        ? Sort.by("recordedAt").ascending()
                        : Sort.by("recordedAt").descending()
        ));

        log.info("Found {} sensor data records, total elements: {}", 
                sensorPage.getContent().size(), sensorPage.getTotalElements());


        int startIndex = page * size;
        return ResponseUtils.mapToPagedResponse(sensorPage, page, size,
                "Tìm thấy " + sensorPage.getContent().size() + " kết quả.",
                data -> {
                    int index = sensorPage.getContent().indexOf(data);
                    return SensorReadingDTO.from(data, startIndex + index + 1);
                },
                "Không tìm thấy dữ liệu cảm biến.");
    }




    
}
