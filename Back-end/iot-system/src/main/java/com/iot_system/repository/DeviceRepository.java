package com.iot_system.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.iot_system.domain.entity.Device;


public interface DeviceRepository extends JpaRepository<Device, Long> {
    Optional<Device> findByDeviceUid(String deviceUid);

} 