import { MetadataEntities, MetadataEntity } from "../../metadata/entities/MetadataEntities";
import { Either } from "../../common/entities/Either";
import { validate_O_MQ_2 } from "./validations/O-MQ-2-temp/validate_O-MQ-2";
import { validate_OG_MQ_1 } from "./validations/OG-MQ-1-temp/validate-OG-MQ-1";
import { validate_SHST_MQ_1 } from "./validations/SHST-MQ-1-temp/validate_SHST-MQ-1";
import { validate_ALL_MQ_16 } from "./validations/ALL-MQ-16-temp/validate_ALL-MQ-16";
import { validate_ALL_MQ_19 } from "./validations/ALL-MQ-19-temp/validate_ALL-MQ-19";
import { validate_ALL_MQ_21 } from "./validations/ALL-MQ-21-temp/validate_ALL-MQ-21";
import { validate_PR_ST_3 } from "./validations/PR-ST-3-temp/validate_PR-ST-3";
import { validate_PRV_MQ_1 } from "./validations/PRV-MQ-1-temp/validate_PRV-MQ-1";
import { validate_PRV_MQ_2 } from "./validations/PRV-MQ-2-temp/validate_PRV-MQ-2";

export type MetadataPackageToValidate<T = MetadataEntity> = Partial<Record<keyof MetadataEntities, Partial<T>[]>>;

export function validatePackageContents(contents: MetadataPackageToValidate): Either<string[], void> {
    const o_mq_2_errors = validate_O_MQ_2(contents);
    const og_mq_1_errors = validate_OG_MQ_1(contents);
    const shst_mq_1_errors = validate_SHST_MQ_1(contents);
    const all_mq_16_errors = validate_ALL_MQ_16(contents);
    const all_mq_19_errors = validate_ALL_MQ_19(contents);
    const all_mq_21_errors = validate_ALL_MQ_21(contents);
    const pr_st_3_errors = validate_PR_ST_3(contents);
    const prv_mq_1_errors = validate_PRV_MQ_1(contents);
    const prv_mq_2_errors = validate_PRV_MQ_2(contents);

    const errors = [
        ...o_mq_2_errors,
        ...og_mq_1_errors,
        ...shst_mq_1_errors,
        ...all_mq_16_errors,
        ...all_mq_19_errors,
        ...all_mq_21_errors,
        ...pr_st_3_errors,
        ...prv_mq_1_errors,
        ...prv_mq_2_errors,
    ];

    return errors.length === 0 ? Either.success(undefined) : Either.error(errors);
}
