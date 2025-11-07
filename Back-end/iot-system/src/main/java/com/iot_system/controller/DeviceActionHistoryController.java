package com.iot_system.controller;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.iot_system.domain.dto.ActionHistoryDTO;
import com.iot_system.domain.dto.PagedResponse;
import com.iot_system.domain.enums.DeviceState;
import com.iot_system.domain.enums.DeviceType;
import com.iot_system.service.ActionHistoryService;
 
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

@RestController
@RequestMapping("/api/device-actions")
public class DeviceActionHistoryController {

    private final ActionHistoryService actionHistoryService;

    public DeviceActionHistoryController(ActionHistoryService actionHistoryService) {
        this.actionHistoryService = actionHistoryService;
    }

    @GetMapping("/search")
    public PagedResponse<ActionHistoryDTO> search(
            @RequestParam(required = false) String dateStr,
            @RequestParam(required = false) DeviceType deviceType,
            @RequestParam(required = false) DeviceState action,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size,
            @RequestParam(defaultValue = "desc") String sort
    ) {
        return actionHistoryService.search(dateStr, deviceType, action, page, size, sort);
    }
}
