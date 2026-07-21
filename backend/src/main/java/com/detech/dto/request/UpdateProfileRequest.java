package com.detech.dto.request;

import lombok.Data;

@Data
public class UpdateProfileRequest {

    private String fullName;

    private String phone;

    private String walletAddress;

    private String opayAccount;
    private String opayName;

    private String palmpayAccount;
    private String palmpayName;

    private String moniepointAccount;
    private String moniepointName;

}