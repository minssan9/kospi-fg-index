-- CreateTable
CREATE TABLE `sentiment_fear_greed_index` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATE NOT NULL,
    `value` INTEGER NOT NULL,
    `level` VARCHAR(191) NOT NULL,
    `confidence` INTEGER NOT NULL,
    `priceMomentum` INTEGER NOT NULL,
    `investorSentiment` INTEGER NOT NULL,
    `putCallRatio` INTEGER NOT NULL,
    `volatilityIndex` INTEGER NOT NULL,
    `safeHavenDemand` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `sentiment_fear_greed_index_date_key`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `market_kospi_data` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATE NOT NULL,
    `iscd_stat_cls_code` VARCHAR(191) NOT NULL,
    `marg_rate` VARCHAR(191) NOT NULL,
    `rprs_mrkt_kor_name` VARCHAR(191) NOT NULL,
    `new_hgpr_lwpr_cls_code` VARCHAR(191) NOT NULL,
    `bstp_kor_isnm` VARCHAR(191) NOT NULL,
    `temp_stop_yn` VARCHAR(191) NOT NULL,
    `oprc_rang_cont_yn` VARCHAR(191) NOT NULL,
    `clpr_rang_cont_yn` VARCHAR(191) NOT NULL,
    `crdt_able_yn` VARCHAR(191) NOT NULL,
    `grmn_rate_cls_code` VARCHAR(191) NOT NULL,
    `elw_pblc_yn` VARCHAR(191) NOT NULL,
    `stck_prpr` VARCHAR(191) NOT NULL,
    `prdy_vrss` VARCHAR(191) NOT NULL,
    `prdy_vrss_sign` VARCHAR(191) NOT NULL,
    `prdy_ctrt` VARCHAR(191) NOT NULL,
    `acml_tr_pbmn` VARCHAR(191) NOT NULL,
    `acml_vol` VARCHAR(191) NOT NULL,
    `prdy_vrss_vol_rate` VARCHAR(191) NOT NULL,
    `stck_oprc` VARCHAR(191) NOT NULL,
    `stck_hgpr` VARCHAR(191) NOT NULL,
    `stck_lwpr` VARCHAR(191) NOT NULL,
    `stck_mxpr` VARCHAR(191) NOT NULL,
    `stck_llam` VARCHAR(191) NOT NULL,
    `stck_sdpr` VARCHAR(191) NOT NULL,
    `wghn_avrg_stck_prc` VARCHAR(191) NOT NULL,
    `hts_frgn_ehrt` VARCHAR(191) NOT NULL,
    `frgn_ntby_qty` VARCHAR(191) NOT NULL,
    `pgtr_ntby_qty` VARCHAR(191) NOT NULL,
    `pvt_scnd_dmrs_prc` VARCHAR(191) NOT NULL,
    `pvt_frst_dmrs_prc` VARCHAR(191) NOT NULL,
    `pvt_pont_val` VARCHAR(191) NOT NULL,
    `pvt_frst_dmsp_prc` VARCHAR(191) NOT NULL,
    `pvt_scnd_dmsp_prc` VARCHAR(191) NOT NULL,
    `dmrs_val` VARCHAR(191) NOT NULL,
    `dmsp_val` VARCHAR(191) NOT NULL,
    `cpfn` VARCHAR(191) NOT NULL,
    `rstc_wdth_prc` VARCHAR(191) NOT NULL,
    `stck_fcam` VARCHAR(191) NOT NULL,
    `stck_sspr` VARCHAR(191) NOT NULL,
    `aspr_unit` VARCHAR(191) NOT NULL,
    `hts_deal_qty_unit_val` VARCHAR(191) NOT NULL,
    `lstn_stcn` VARCHAR(191) NOT NULL,
    `hts_avls` VARCHAR(191) NOT NULL,
    `per` VARCHAR(191) NOT NULL,
    `pbr` VARCHAR(191) NOT NULL,
    `stac_month` VARCHAR(191) NOT NULL,
    `vol_tnrt` VARCHAR(191) NOT NULL,
    `eps` VARCHAR(191) NOT NULL,
    `bps` VARCHAR(191) NOT NULL,
    `d250_hgpr` VARCHAR(191) NOT NULL,
    `d250_hgpr_date` VARCHAR(191) NOT NULL,
    `d250_hgpr_vrss_prpr_rate` VARCHAR(191) NOT NULL,
    `d250_lwpr` VARCHAR(191) NOT NULL,
    `d250_lwpr_date` VARCHAR(191) NOT NULL,
    `d250_lwpr_vrss_prpr_rate` VARCHAR(191) NOT NULL,
    `stck_dryy_hgpr` VARCHAR(191) NOT NULL,
    `dryy_hgpr_vrss_prpr_rate` VARCHAR(191) NOT NULL,
    `dryy_hgpr_date` VARCHAR(191) NOT NULL,
    `stck_dryy_lwpr` VARCHAR(191) NOT NULL,
    `dryy_lwpr_vrss_prpr_rate` VARCHAR(191) NOT NULL,
    `dryy_lwpr_date` VARCHAR(191) NOT NULL,
    `w52_hgpr` VARCHAR(191) NOT NULL,
    `w52_hgpr_vrss_prpr_ctrt` VARCHAR(191) NOT NULL,
    `w52_hgpr_date` VARCHAR(191) NOT NULL,
    `w52_lwpr` VARCHAR(191) NOT NULL,
    `w52_lwpr_vrss_prpr_ctrt` VARCHAR(191) NOT NULL,
    `w52_lwpr_date` VARCHAR(191) NOT NULL,
    `whol_loan_rmnd_rate` VARCHAR(191) NOT NULL,
    `ssts_yn` VARCHAR(191) NOT NULL,
    `stck_shrn_iscd` VARCHAR(191) NOT NULL,
    `fcam_cnnm` VARCHAR(191) NOT NULL,
    `cpfn_cnnm` VARCHAR(191) NOT NULL,
    `apprch_rate` VARCHAR(191) NOT NULL,
    `frgn_hldn_qty` VARCHAR(191) NOT NULL,
    `vi_cls_code` VARCHAR(191) NOT NULL,
    `ovtm_vi_cls_code` VARCHAR(191) NOT NULL,
    `last_ssts_cntg_qty` VARCHAR(191) NOT NULL,
    `invt_caful_yn` VARCHAR(191) NOT NULL,
    `mrkt_warn_cls_code` VARCHAR(191) NOT NULL,
    `short_over_yn` VARCHAR(191) NOT NULL,
    `sltr_yn` VARCHAR(191) NOT NULL,
    `mang_issu_cls_code` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `market_kospi_data_date_key`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `market_kosdaq_data` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATE NOT NULL,
    `iscd_stat_cls_code` VARCHAR(191) NOT NULL,
    `marg_rate` VARCHAR(191) NOT NULL,
    `rprs_mrkt_kor_name` VARCHAR(191) NOT NULL,
    `new_hgpr_lwpr_cls_code` VARCHAR(191) NOT NULL,
    `bstp_kor_isnm` VARCHAR(191) NOT NULL,
    `temp_stop_yn` VARCHAR(191) NOT NULL,
    `oprc_rang_cont_yn` VARCHAR(191) NOT NULL,
    `clpr_rang_cont_yn` VARCHAR(191) NOT NULL,
    `crdt_able_yn` VARCHAR(191) NOT NULL,
    `grmn_rate_cls_code` VARCHAR(191) NOT NULL,
    `elw_pblc_yn` VARCHAR(191) NOT NULL,
    `stck_prpr` VARCHAR(191) NOT NULL,
    `prdy_vrss` VARCHAR(191) NOT NULL,
    `prdy_vrss_sign` VARCHAR(191) NOT NULL,
    `prdy_ctrt` VARCHAR(191) NOT NULL,
    `acml_tr_pbmn` VARCHAR(191) NOT NULL,
    `acml_vol` VARCHAR(191) NOT NULL,
    `prdy_vrss_vol_rate` VARCHAR(191) NOT NULL,
    `stck_oprc` VARCHAR(191) NOT NULL,
    `stck_hgpr` VARCHAR(191) NOT NULL,
    `stck_lwpr` VARCHAR(191) NOT NULL,
    `stck_mxpr` VARCHAR(191) NOT NULL,
    `stck_llam` VARCHAR(191) NOT NULL,
    `stck_sdpr` VARCHAR(191) NOT NULL,
    `wghn_avrg_stck_prc` VARCHAR(191) NOT NULL,
    `hts_frgn_ehrt` VARCHAR(191) NOT NULL,
    `frgn_ntby_qty` VARCHAR(191) NOT NULL,
    `pgtr_ntby_qty` VARCHAR(191) NOT NULL,
    `pvt_scnd_dmrs_prc` VARCHAR(191) NOT NULL,
    `pvt_frst_dmrs_prc` VARCHAR(191) NOT NULL,
    `pvt_pont_val` VARCHAR(191) NOT NULL,
    `pvt_frst_dmsp_prc` VARCHAR(191) NOT NULL,
    `pvt_scnd_dmsp_prc` VARCHAR(191) NOT NULL,
    `dmrs_val` VARCHAR(191) NOT NULL,
    `dmsp_val` VARCHAR(191) NOT NULL,
    `cpfn` VARCHAR(191) NOT NULL,
    `rstc_wdth_prc` VARCHAR(191) NOT NULL,
    `stck_fcam` VARCHAR(191) NOT NULL,
    `stck_sspr` VARCHAR(191) NOT NULL,
    `aspr_unit` VARCHAR(191) NOT NULL,
    `hts_deal_qty_unit_val` VARCHAR(191) NOT NULL,
    `lstn_stcn` VARCHAR(191) NOT NULL,
    `hts_avls` VARCHAR(191) NOT NULL,
    `per` VARCHAR(191) NOT NULL,
    `pbr` VARCHAR(191) NOT NULL,
    `stac_month` VARCHAR(191) NOT NULL,
    `vol_tnrt` VARCHAR(191) NOT NULL,
    `eps` VARCHAR(191) NOT NULL,
    `bps` VARCHAR(191) NOT NULL,
    `d250_hgpr` VARCHAR(191) NOT NULL,
    `d250_hgpr_date` VARCHAR(191) NOT NULL,
    `d250_hgpr_vrss_prpr_rate` VARCHAR(191) NOT NULL,
    `d250_lwpr` VARCHAR(191) NOT NULL,
    `d250_lwpr_date` VARCHAR(191) NOT NULL,
    `d250_lwpr_vrss_prpr_rate` VARCHAR(191) NOT NULL,
    `stck_dryy_hgpr` VARCHAR(191) NOT NULL,
    `dryy_hgpr_vrss_prpr_rate` VARCHAR(191) NOT NULL,
    `dryy_hgpr_date` VARCHAR(191) NOT NULL,
    `stck_dryy_lwpr` VARCHAR(191) NOT NULL,
    `dryy_lwpr_vrss_prpr_rate` VARCHAR(191) NOT NULL,
    `dryy_lwpr_date` VARCHAR(191) NOT NULL,
    `w52_hgpr` VARCHAR(191) NOT NULL,
    `w52_hgpr_vrss_prpr_ctrt` VARCHAR(191) NOT NULL,
    `w52_hgpr_date` VARCHAR(191) NOT NULL,
    `w52_lwpr` VARCHAR(191) NOT NULL,
    `w52_lwpr_vrss_prpr_ctrt` VARCHAR(191) NOT NULL,
    `w52_lwpr_date` VARCHAR(191) NOT NULL,
    `whol_loan_rmnd_rate` VARCHAR(191) NOT NULL,
    `ssts_yn` VARCHAR(191) NOT NULL,
    `stck_shrn_iscd` VARCHAR(191) NOT NULL,
    `fcam_cnnm` VARCHAR(191) NOT NULL,
    `cpfn_cnnm` VARCHAR(191) NOT NULL,
    `apprch_rate` VARCHAR(191) NOT NULL,
    `frgn_hldn_qty` VARCHAR(191) NOT NULL,
    `vi_cls_code` VARCHAR(191) NOT NULL,
    `ovtm_vi_cls_code` VARCHAR(191) NOT NULL,
    `last_ssts_cntg_qty` VARCHAR(191) NOT NULL,
    `invt_caful_yn` VARCHAR(191) NOT NULL,
    `mrkt_warn_cls_code` VARCHAR(191) NOT NULL,
    `short_over_yn` VARCHAR(191) NOT NULL,
    `sltr_yn` VARCHAR(191) NOT NULL,
    `mang_issu_cls_code` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `market_kosdaq_data_date_key`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `trading_investor_trading` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATE NOT NULL,
    `frgn_seln_vol` VARCHAR(191) NOT NULL,
    `frgn_shnu_vol` VARCHAR(191) NOT NULL,
    `frgn_ntby_qty` VARCHAR(191) NOT NULL,
    `frgn_seln_tr_pbmn` VARCHAR(191) NOT NULL,
    `frgn_shnu_tr_pbmn` VARCHAR(191) NOT NULL,
    `frgn_ntby_tr_pbmn` VARCHAR(191) NOT NULL,
    `prsn_seln_vol` VARCHAR(191) NOT NULL,
    `prsn_shnu_vol` VARCHAR(191) NOT NULL,
    `prsn_ntby_qty` VARCHAR(191) NOT NULL,
    `prsn_seln_tr_pbmn` VARCHAR(191) NOT NULL,
    `prsn_shnu_tr_pbmn` VARCHAR(191) NOT NULL,
    `prsn_ntby_tr_pbmn` VARCHAR(191) NOT NULL,
    `orgn_seln_vol` VARCHAR(191) NOT NULL,
    `orgn_shnu_vol` VARCHAR(191) NOT NULL,
    `orgn_ntby_qty` VARCHAR(191) NOT NULL,
    `orgn_seln_tr_pbmn` VARCHAR(191) NOT NULL,
    `orgn_shnu_tr_pbmn` VARCHAR(191) NOT NULL,
    `orgn_ntby_tr_pbmn` VARCHAR(191) NOT NULL,
    `scrt_seln_vol` VARCHAR(191) NOT NULL,
    `scrt_shnu_vol` VARCHAR(191) NOT NULL,
    `scrt_ntby_qty` VARCHAR(191) NOT NULL,
    `scrt_seln_tr_pbmn` VARCHAR(191) NOT NULL,
    `scrt_shnu_tr_pbmn` VARCHAR(191) NOT NULL,
    `scrt_ntby_tr_pbmn` VARCHAR(191) NOT NULL,
    `ivtr_seln_vol` VARCHAR(191) NOT NULL,
    `ivtr_shnu_vol` VARCHAR(191) NOT NULL,
    `ivtr_ntby_qty` VARCHAR(191) NOT NULL,
    `ivtr_seln_tr_pbmn` VARCHAR(191) NOT NULL,
    `ivtr_shnu_tr_pbmn` VARCHAR(191) NOT NULL,
    `ivtr_ntby_tr_pbmn` VARCHAR(191) NOT NULL,
    `pe_fund_seln_tr_pbmn` VARCHAR(191) NOT NULL,
    `pe_fund_seln_vol` VARCHAR(191) NOT NULL,
    `pe_fund_ntby_vol` VARCHAR(191) NOT NULL,
    `pe_fund_shnu_tr_pbmn` VARCHAR(191) NOT NULL,
    `pe_fund_shnu_vol` VARCHAR(191) NOT NULL,
    `pe_fund_ntby_tr_pbmn` VARCHAR(191) NOT NULL,
    `bank_seln_vol` VARCHAR(191) NOT NULL,
    `bank_shnu_vol` VARCHAR(191) NOT NULL,
    `bank_ntby_qty` VARCHAR(191) NOT NULL,
    `bank_seln_tr_pbmn` VARCHAR(191) NOT NULL,
    `bank_shnu_tr_pbmn` VARCHAR(191) NOT NULL,
    `bank_ntby_tr_pbmn` VARCHAR(191) NOT NULL,
    `insu_seln_vol` VARCHAR(191) NOT NULL,
    `insu_shnu_vol` VARCHAR(191) NOT NULL,
    `insu_ntby_qty` VARCHAR(191) NOT NULL,
    `insu_seln_tr_pbmn` VARCHAR(191) NOT NULL,
    `insu_shnu_tr_pbmn` VARCHAR(191) NOT NULL,
    `insu_ntby_tr_pbmn` VARCHAR(191) NOT NULL,
    `mrbn_seln_vol` VARCHAR(191) NOT NULL,
    `mrbn_shnu_vol` VARCHAR(191) NOT NULL,
    `mrbn_ntby_qty` VARCHAR(191) NOT NULL,
    `mrbn_seln_tr_pbmn` VARCHAR(191) NOT NULL,
    `mrbn_shnu_tr_pbmn` VARCHAR(191) NOT NULL,
    `mrbn_ntby_tr_pbmn` VARCHAR(191) NOT NULL,
    `fund_seln_vol` VARCHAR(191) NOT NULL,
    `fund_shnu_vol` VARCHAR(191) NOT NULL,
    `fund_ntby_qty` VARCHAR(191) NOT NULL,
    `fund_seln_tr_pbmn` VARCHAR(191) NOT NULL,
    `fund_shnu_tr_pbmn` VARCHAR(191) NOT NULL,
    `fund_ntby_tr_pbmn` VARCHAR(191) NOT NULL,
    `etc_orgt_seln_vol` VARCHAR(191) NOT NULL,
    `etc_orgt_shnu_vol` VARCHAR(191) NOT NULL,
    `etc_orgt_ntby_vol` VARCHAR(191) NOT NULL,
    `etc_orgt_seln_tr_pbmn` VARCHAR(191) NOT NULL,
    `etc_orgt_shnu_tr_pbmn` VARCHAR(191) NOT NULL,
    `etc_orgt_ntby_tr_pbmn` VARCHAR(191) NOT NULL,
    `etc_corp_seln_vol` VARCHAR(191) NOT NULL,
    `etc_corp_shnu_vol` VARCHAR(191) NOT NULL,
    `etc_corp_ntby_vol` VARCHAR(191) NOT NULL,
    `etc_corp_seln_tr_pbmn` VARCHAR(191) NOT NULL,
    `etc_corp_shnu_tr_pbmn` VARCHAR(191) NOT NULL,
    `etc_corp_ntby_tr_pbmn` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `trading_investor_trading_date_key`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `trading_option_data` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATE NOT NULL,
    `putVolume` BIGINT NOT NULL,
    `callVolume` BIGINT NOT NULL,
    `putCallRatio` DECIMAL(8, 4) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `trading_option_data_date_key`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `macro_interest_rate_data` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATE NOT NULL,
    `baseRate` DECIMAL(5, 2) NOT NULL,
    `callRate` DECIMAL(5, 2) NOT NULL,
    `cd91Rate` DECIMAL(5, 2) NOT NULL,
    `treasuryBond3Y` DECIMAL(5, 2) NOT NULL,
    `treasuryBond10Y` DECIMAL(5, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `macro_interest_rate_data_date_key`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `macro_exchange_rate_data` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATE NOT NULL,
    `usdKrw` DECIMAL(8, 2) NOT NULL,
    `eurKrw` DECIMAL(8, 2) NOT NULL,
    `jpyKrw` DECIMAL(8, 4) NOT NULL,
    `cnyKrw` DECIMAL(8, 4) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `macro_exchange_rate_data_date_key`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `macro_economic_indicator_data` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATE NOT NULL,
    `cpi` DECIMAL(5, 2) NULL,
    `ppi` DECIMAL(5, 2) NULL,
    `unemploymentRate` DECIMAL(4, 2) NULL,
    `gdpGrowthRate` DECIMAL(5, 2) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `macro_economic_indicator_data_date_key`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `market_vkospi_data` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATE NOT NULL,
    `value` DECIMAL(5, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `market_vkospi_data_date_key`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `market_bond_yield_curve_data` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATE NOT NULL,
    `yield1Y` DECIMAL(5, 2) NULL,
    `yield3Y` DECIMAL(5, 2) NULL,
    `yield5Y` DECIMAL(5, 2) NULL,
    `yield10Y` DECIMAL(5, 2) NULL,
    `yield20Y` DECIMAL(5, 2) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `market_bond_yield_curve_data_date_key`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_data_collection_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATE NOT NULL,
    `source` VARCHAR(191) NOT NULL,
    `dataType` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `recordCount` INTEGER NULL,
    `errorMessage` TEXT NULL,
    `duration` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_config` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(191) NOT NULL,
    `value` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `system_config_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `external_upbit_index_data` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATE NOT NULL,
    `value` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `external_upbit_index_data_date_key`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `external_cnn_fg_index_data` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATE NOT NULL,
    `value` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `external_cnn_fg_index_data_date_key`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `external_korea_fg_index_data` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATE NOT NULL,
    `value` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `external_korea_fg_index_data_date_key`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admin_users` (
    `id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `role` ENUM('SUPER_ADMIN', 'ADMIN', 'VIEWER', 'ANALYST') NOT NULL,
    `permissions` TEXT NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isLocked` BOOLEAN NOT NULL DEFAULT false,
    `lockReason` VARCHAR(191) NULL,
    `lockedAt` DATETIME(3) NULL,
    `lockedUntil` DATETIME(3) NULL,
    `failedAttempts` INTEGER NOT NULL DEFAULT 0,
    `lastFailedAt` DATETIME(3) NULL,
    `passwordChangedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `mustChangePassword` BOOLEAN NOT NULL DEFAULT false,
    `mfaEnabled` BOOLEAN NOT NULL DEFAULT false,
    `mfaSecret` VARCHAR(191) NULL,
    `mfaBackupCodes` TEXT NOT NULL,
    `firstName` VARCHAR(191) NULL,
    `lastName` VARCHAR(191) NULL,
    `lastLoginAt` DATETIME(3) NULL,
    `lastLoginIp` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `admin_users_username_key`(`username`),
    UNIQUE INDEX `admin_users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admin_sessions` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `sessionId` VARCHAR(191) NOT NULL,
    `accessToken` VARCHAR(191) NOT NULL,
    `ipAddress` VARCHAR(191) NOT NULL,
    `userAgent` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastUsedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `admin_sessions_sessionId_key`(`sessionId`),
    UNIQUE INDEX `admin_sessions_accessToken_key`(`accessToken`),
    INDEX `admin_sessions_userId_idx`(`userId`),
    INDEX `admin_sessions_sessionId_idx`(`sessionId`),
    INDEX `admin_sessions_accessToken_idx`(`accessToken`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admin_refresh_tokens` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `sessionId` VARCHAR(191) NOT NULL,
    `isRevoked` BOOLEAN NOT NULL DEFAULT false,
    `revokedAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `admin_refresh_tokens_token_key`(`token`),
    INDEX `admin_refresh_tokens_userId_idx`(`userId`),
    INDEX `admin_refresh_tokens_token_idx`(`token`),
    INDEX `admin_refresh_tokens_sessionId_idx`(`sessionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admin_login_attempts` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `username` VARCHAR(191) NOT NULL,
    `ipAddress` VARCHAR(191) NOT NULL,
    `userAgent` VARCHAR(191) NULL,
    `success` BOOLEAN NOT NULL,
    `failReason` VARCHAR(191) NULL,
    `attemptedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `admin_login_attempts_userId_idx`(`userId`),
    INDEX `admin_login_attempts_username_idx`(`username`),
    INDEX `admin_login_attempts_ipAddress_idx`(`ipAddress`),
    INDEX `admin_login_attempts_attemptedAt_idx`(`attemptedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admin_audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `sessionId` VARCHAR(191) NULL,
    `action` VARCHAR(191) NOT NULL,
    `resource` VARCHAR(191) NULL,
    `details` TEXT NULL,
    `ipAddress` VARCHAR(191) NOT NULL,
    `userAgent` VARCHAR(191) NULL,
    `success` BOOLEAN NOT NULL,
    `riskLevel` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'LOW',
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `admin_audit_logs_userId_idx`(`userId`),
    INDEX `admin_audit_logs_action_idx`(`action`),
    INDEX `admin_audit_logs_timestamp_idx`(`timestamp`),
    INDEX `admin_audit_logs_riskLevel_idx`(`riskLevel`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `security_config` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `value` TEXT NOT NULL,
    `description` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `security_config_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rate_limit_records` (
    `id` VARCHAR(191) NOT NULL,
    `identifier` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `attempts` INTEGER NOT NULL DEFAULT 1,
    `windowStart` DATETIME(3) NOT NULL,
    `windowEnd` DATETIME(3) NOT NULL,
    `isBlocked` BOOLEAN NOT NULL DEFAULT false,

    INDEX `rate_limit_records_identifier_action_idx`(`identifier`, `action`),
    INDEX `rate_limit_records_windowStart_windowEnd_idx`(`windowStart`, `windowEnd`),
    UNIQUE INDEX `rate_limit_records_identifier_action_windowStart_key`(`identifier`, `action`, `windowStart`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification_channels` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` ENUM('EMAIL', 'SLACK', 'TEAMS', 'WEBHOOK', 'SMS', 'PUSH', 'WEBSOCKET') NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `config` TEXT NOT NULL,
    `maxPerHour` INTEGER NOT NULL DEFAULT 100,
    `maxPerDay` INTEGER NOT NULL DEFAULT 1000,
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `notification_channels_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification_subscriptions` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `channelId` VARCHAR(191) NOT NULL,
    `eventType` VARCHAR(191) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `filters` TEXT NULL,
    `immediateNotify` BOOLEAN NOT NULL DEFAULT true,
    `digestSettings` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `notification_subscriptions_userId_idx`(`userId`),
    INDEX `notification_subscriptions_channelId_idx`(`channelId`),
    INDEX `notification_subscriptions_eventType_idx`(`eventType`),
    UNIQUE INDEX `notification_subscriptions_userId_channelId_eventType_key`(`userId`, `channelId`, `eventType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification_templates` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `channelId` VARCHAR(191) NOT NULL,
    `eventType` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(191) NULL,
    `body` TEXT NOT NULL,
    `htmlBody` TEXT NULL,
    `variables` TEXT NOT NULL,
    `description` VARCHAR(191) NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `notification_templates_name_key`(`name`),
    INDEX `notification_templates_channelId_idx`(`channelId`),
    INDEX `notification_templates_eventType_idx`(`eventType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification_logs` (
    `id` VARCHAR(191) NOT NULL,
    `channelId` VARCHAR(191) NOT NULL,
    `templateId` VARCHAR(191) NULL,
    `recipient` VARCHAR(191) NOT NULL,
    `eventType` VARCHAR(191) NOT NULL,
    `eventId` VARCHAR(191) NULL,
    `subject` VARCHAR(191) NULL,
    `body` TEXT NOT NULL,
    `metadata` TEXT NULL,
    `status` ENUM('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'RETRYING') NOT NULL DEFAULT 'PENDING',
    `sentAt` DATETIME(3) NULL,
    `deliveredAt` DATETIME(3) NULL,
    `failedAt` DATETIME(3) NULL,
    `errorMessage` TEXT NULL,
    `retryCount` INTEGER NOT NULL DEFAULT 0,
    `maxRetries` INTEGER NOT NULL DEFAULT 3,
    `nextRetryAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `notification_logs_channelId_idx`(`channelId`),
    INDEX `notification_logs_eventType_idx`(`eventType`),
    INDEX `notification_logs_status_idx`(`status`),
    INDEX `notification_logs_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `report_definitions` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `category` ENUM('SYSTEM_STATUS', 'DATA_QUALITY', 'BUSINESS_METRICS', 'SECURITY_AUDIT', 'PERFORMANCE', 'COMPLIANCE', 'CUSTOM') NOT NULL,
    `dataSource` VARCHAR(191) NOT NULL,
    `parameters` TEXT NOT NULL,
    `template` TEXT NOT NULL,
    `supportedFormats` TEXT NOT NULL,
    `defaultFormat` VARCHAR(191) NOT NULL DEFAULT 'PDF',
    `isScheduled` BOOLEAN NOT NULL DEFAULT false,
    `cronExpression` VARCHAR(191) NULL,
    `timezone` VARCHAR(191) NOT NULL DEFAULT 'Asia/Seoul',
    `requiredRole` ENUM('SUPER_ADMIN', 'ADMIN', 'VIEWER', 'ANALYST') NOT NULL DEFAULT 'VIEWER',
    `isPublic` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `report_definitions_name_key`(`name`),
    INDEX `report_definitions_category_idx`(`category`),
    INDEX `report_definitions_isScheduled_idx`(`isScheduled`),
    INDEX `report_definitions_createdBy_idx`(`createdBy`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `report_executions` (
    `id` VARCHAR(191) NOT NULL,
    `reportId` VARCHAR(191) NOT NULL,
    `executedBy` VARCHAR(191) NULL,
    `parameters` TEXT NULL,
    `format` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,
    `failedAt` DATETIME(3) NULL,
    `errorMessage` TEXT NULL,
    `fileName` VARCHAR(191) NULL,
    `filePath` VARCHAR(191) NULL,
    `fileSize` INTEGER NULL,
    `rowCount` INTEGER NULL,
    `executionTime` INTEGER NULL,
    `metadata` TEXT NULL,

    INDEX `report_executions_reportId_idx`(`reportId`),
    INDEX `report_executions_executedBy_idx`(`executedBy`),
    INDEX `report_executions_status_idx`(`status`),
    INDEX `report_executions_startedAt_idx`(`startedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `report_schedules` (
    `id` VARCHAR(191) NOT NULL,
    `reportId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `cronExpression` VARCHAR(191) NOT NULL,
    `timezone` VARCHAR(191) NOT NULL DEFAULT 'Asia/Seoul',
    `parameters` TEXT NULL,
    `format` VARCHAR(191) NOT NULL DEFAULT 'PDF',
    `notifyOnSuccess` BOOLEAN NOT NULL DEFAULT true,
    `notifyOnFailure` BOOLEAN NOT NULL DEFAULT true,
    `recipients` TEXT NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastRunAt` DATETIME(3) NULL,
    `nextRunAt` DATETIME(3) NULL,
    `consecutiveFailures` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `report_schedules_reportId_idx`(`reportId`),
    INDEX `report_schedules_isActive_idx`(`isActive`),
    INDEX `report_schedules_nextRunAt_idx`(`nextRunAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `data_export_requests` (
    `id` VARCHAR(191) NOT NULL,
    `requestedBy` VARCHAR(191) NOT NULL,
    `dataType` VARCHAR(191) NOT NULL,
    `format` VARCHAR(191) NOT NULL,
    `dateRange` TEXT NOT NULL,
    `filters` TEXT NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,
    `failedAt` DATETIME(3) NULL,
    `errorMessage` TEXT NULL,
    `fileName` VARCHAR(191) NULL,
    `filePath` VARCHAR(191) NULL,
    `fileSize` INTEGER NULL,
    `recordCount` INTEGER NULL,
    `downloadCount` INTEGER NOT NULL DEFAULT 0,
    `expiresAt` DATETIME(3) NULL,

    INDEX `data_export_requests_requestedBy_idx`(`requestedBy`),
    INDEX `data_export_requests_status_idx`(`status`),
    INDEX `data_export_requests_startedAt_idx`(`startedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_insights` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('TREND_ANALYSIS', 'ANOMALY_DETECTION', 'PERFORMANCE_OPTIMIZATION', 'SECURITY_RECOMMENDATION', 'DATA_QUALITY_ISSUE', 'BUSINESS_OPPORTUNITY') NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `severity` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL,
    `confidence` INTEGER NOT NULL,
    `dataSource` VARCHAR(191) NOT NULL,
    `analysisDate` DATETIME(3) NOT NULL,
    `affectedPeriod` TEXT NULL,
    `metrics` TEXT NOT NULL,
    `recommendations` TEXT NOT NULL,
    `actionItems` TEXT NOT NULL,
    `status` ENUM('NEW', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED') NOT NULL DEFAULT 'NEW',
    `acknowledgedBy` VARCHAR(191) NULL,
    `acknowledgedAt` DATETIME(3) NULL,
    `resolvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `system_insights_type_idx`(`type`),
    INDEX `system_insights_category_idx`(`category`),
    INDEX `system_insights_severity_idx`(`severity`),
    INDEX `system_insights_status_idx`(`status`),
    INDEX `system_insights_analysisDate_idx`(`analysisDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `websocket_connections` (
    `id` VARCHAR(191) NOT NULL,
    `sessionId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `socketId` VARCHAR(191) NOT NULL,
    `ipAddress` VARCHAR(191) NOT NULL,
    `userAgent` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `connectedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastPingAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `disconnectedAt` DATETIME(3) NULL,
    `subscriptions` TEXT NOT NULL,

    UNIQUE INDEX `websocket_connections_sessionId_key`(`sessionId`),
    UNIQUE INDEX `websocket_connections_socketId_key`(`socketId`),
    INDEX `websocket_connections_userId_idx`(`userId`),
    INDEX `websocket_connections_isActive_idx`(`isActive`),
    INDEX `websocket_connections_connectedAt_idx`(`connectedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dart_disclosures` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `receiptNumber` VARCHAR(191) NOT NULL,
    `corpCode` VARCHAR(191) NOT NULL,
    `corpName` VARCHAR(191) NOT NULL,
    `stockCode` VARCHAR(191) NULL,
    `reportName` TEXT NOT NULL,
    `flrName` VARCHAR(191) NOT NULL,
    `receiptDate` DATE NOT NULL,
    `disclosureDate` DATE NOT NULL,
    `reportCode` VARCHAR(191) NOT NULL,
    `remarks` TEXT NULL,
    `sentimentImpact` VARCHAR(191) NULL,
    `impactScore` INTEGER NULL,
    `keywords` TEXT NULL,
    `category` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `dart_disclosures_receiptNumber_key`(`receiptNumber`),
    INDEX `dart_disclosures_corpCode_idx`(`corpCode`),
    INDEX `dart_disclosures_receiptDate_idx`(`receiptDate`),
    INDEX `dart_disclosures_reportCode_idx`(`reportCode`),
    INDEX `dart_disclosures_sentimentImpact_idx`(`sentimentImpact`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dart_companies` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `corpCode` VARCHAR(191) NOT NULL,
    `corpName` VARCHAR(191) NOT NULL,
    `corpNameEng` VARCHAR(191) NULL,
    `stockName` VARCHAR(191) NULL,
    `stockCode` VARCHAR(191) NULL,
    `ceoName` VARCHAR(191) NULL,
    `corpCls` VARCHAR(191) NULL,
    `jurirNo` VARCHAR(191) NULL,
    `bizrNo` VARCHAR(191) NULL,
    `adres` TEXT NULL,
    `homUrl` VARCHAR(191) NULL,
    `irUrl` VARCHAR(191) NULL,
    `phnNo` VARCHAR(191) NULL,
    `faxNo` VARCHAR(191) NULL,
    `indutyCode` VARCHAR(191) NULL,
    `estDate` VARCHAR(191) NULL,
    `accMt` VARCHAR(191) NULL,
    `isKospi200` BOOLEAN NOT NULL DEFAULT false,
    `kospi200Rank` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `dart_companies_corpCode_key`(`corpCode`),
    INDEX `dart_companies_stockCode_idx`(`stockCode`),
    INDEX `dart_companies_corpCls_idx`(`corpCls`),
    INDEX `dart_companies_isKospi200_idx`(`isKospi200`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dart_financials` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `corpCode` VARCHAR(191) NOT NULL,
    `businessYear` VARCHAR(191) NOT NULL,
    `reportCode` VARCHAR(191) NOT NULL,
    `reprtNm` VARCHAR(191) NULL,
    `acntNm` VARCHAR(191) NOT NULL,
    `thstrmNm` VARCHAR(191) NULL,
    `thstrmAmount` VARCHAR(191) NULL,
    `frmtrmNm` VARCHAR(191) NULL,
    `frmtrmAmount` VARCHAR(191) NULL,
    `bfefrmtrmNm` VARCHAR(191) NULL,
    `bfefrmtrmAmount` VARCHAR(191) NULL,
    `ord` VARCHAR(191) NULL,
    `currency` VARCHAR(191) NULL,
    `fsCls` VARCHAR(191) NULL,
    `sjNm` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `dart_financials_corpCode_idx`(`corpCode`),
    INDEX `dart_financials_businessYear_idx`(`businessYear`),
    UNIQUE INDEX `dart_financials_corpCode_businessYear_reportCode_acntNm_key`(`corpCode`, `businessYear`, `reportCode`, `acntNm`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dart_batch_logs` (
    `id` VARCHAR(191) NOT NULL,
    `jobId` VARCHAR(191) NOT NULL,
    `jobType` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `startTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `endTime` DATETIME(3) NULL,
    `processedCount` INTEGER NOT NULL DEFAULT 0,
    `successCount` INTEGER NOT NULL DEFAULT 0,
    `failedCount` INTEGER NOT NULL DEFAULT 0,
    `errors` TEXT NULL,
    `parameters` TEXT NULL,
    `resultSummary` TEXT NULL,

    UNIQUE INDEX `dart_batch_logs_jobId_key`(`jobId`),
    INDEX `dart_batch_logs_jobType_idx`(`jobType`),
    INDEX `dart_batch_logs_status_idx`(`status`),
    INDEX `dart_batch_logs_startTime_idx`(`startTime`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dart_collection_stats` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATE NOT NULL,
    `totalApiCalls` INTEGER NOT NULL DEFAULT 0,
    `successfulCalls` INTEGER NOT NULL DEFAULT 0,
    `failedCalls` INTEGER NOT NULL DEFAULT 0,
    `dataPoints` INTEGER NOT NULL DEFAULT 0,
    `averageResponseTime` INTEGER NOT NULL DEFAULT 0,
    `rateLimitRemaining` INTEGER NOT NULL DEFAULT 10000,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `dart_collection_stats_date_key`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dart_stock_holdings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `corpCode` VARCHAR(191) NOT NULL,
    `corpName` VARCHAR(191) NOT NULL,
    `stockCode` VARCHAR(191) NULL,
    `reportDate` DATE NOT NULL,
    `reporterName` VARCHAR(191) NOT NULL,
    `holdingRatio` DECIMAL(5, 2) NOT NULL,
    `holdingShares` BIGINT NOT NULL,
    `changeRatio` DECIMAL(5, 2) NOT NULL,
    `changeShares` BIGINT NOT NULL,
    `changeReason` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `dart_stock_holdings_corpCode_idx`(`corpCode`),
    INDEX `dart_stock_holdings_reportDate_idx`(`reportDate`),
    UNIQUE INDEX `dart_stock_holdings_corpCode_reportDate_reporterName_key`(`corpCode`, `reportDate`, `reporterName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dart_alerts` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `corpCodes` TEXT NOT NULL,
    `keywords` TEXT NOT NULL,
    `reportTypes` TEXT NOT NULL,
    `minImpactScore` INTEGER NOT NULL DEFAULT 0,
    `channels` TEXT NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `dart_alerts_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `admin_sessions` ADD CONSTRAINT `admin_sessions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `admin_users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `admin_refresh_tokens` ADD CONSTRAINT `admin_refresh_tokens_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `admin_users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `admin_login_attempts` ADD CONSTRAINT `admin_login_attempts_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `admin_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `admin_audit_logs` ADD CONSTRAINT `admin_audit_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `admin_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification_subscriptions` ADD CONSTRAINT `notification_subscriptions_channelId_fkey` FOREIGN KEY (`channelId`) REFERENCES `notification_channels`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification_subscriptions` ADD CONSTRAINT `notification_subscriptions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `admin_users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification_templates` ADD CONSTRAINT `notification_templates_channelId_fkey` FOREIGN KEY (`channelId`) REFERENCES `notification_channels`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification_logs` ADD CONSTRAINT `notification_logs_channelId_fkey` FOREIGN KEY (`channelId`) REFERENCES `notification_channels`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification_logs` ADD CONSTRAINT `notification_logs_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `notification_templates`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `report_definitions` ADD CONSTRAINT `report_definitions_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `admin_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `report_executions` ADD CONSTRAINT `report_executions_reportId_fkey` FOREIGN KEY (`reportId`) REFERENCES `report_definitions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `report_executions` ADD CONSTRAINT `report_executions_executedBy_fkey` FOREIGN KEY (`executedBy`) REFERENCES `admin_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `report_schedules` ADD CONSTRAINT `report_schedules_reportId_fkey` FOREIGN KEY (`reportId`) REFERENCES `report_definitions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `data_export_requests` ADD CONSTRAINT `data_export_requests_requestedBy_fkey` FOREIGN KEY (`requestedBy`) REFERENCES `admin_users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `system_insights` ADD CONSTRAINT `system_insights_acknowledgedBy_fkey` FOREIGN KEY (`acknowledgedBy`) REFERENCES `admin_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `websocket_connections` ADD CONSTRAINT `websocket_connections_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `admin_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
