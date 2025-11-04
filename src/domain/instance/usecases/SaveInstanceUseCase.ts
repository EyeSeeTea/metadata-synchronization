import i18n from "../../../utils/i18n";
import { UseCase } from "../../common/entities/UseCase";
import { ValidationError } from "../../common/entities/Validations";
import { Instance } from "../entities/Instance";
import { InstanceRepository } from "../repositories/InstanceRepository";

export class SaveInstanceUseCase implements UseCase {
    constructor(private instanceRepository: InstanceRepository) {}

    public async execute(instance: Instance): Promise<ValidationError[]> {
        const instances = await this.instanceRepository.getAll({});
        const instanceByName = instances?.find(existed => existed.name === instance.name);

        if (instanceByName && instanceByName.id !== instance.id) {
            return [
                {
                    property: "name",
                    error: "name_exists",
                    description: i18n.t("An instance with this name already exists"),
                },
            ];
        }

        const exitedAdexInstanceByUrl =
            instance.type === "aggregated-data-exchange"
                ? instances?.find(
                      existed => existed.type === "aggregated-data-exchange" && existed.url === instance.url
                  )
                : undefined;

        if (exitedAdexInstanceByUrl && exitedAdexInstanceByUrl.id !== instance.id) {
            return [
                {
                    property: "url",
                    error: "url_exists",
                    description: i18n.t(
                        "An Aggregated Data Exchange instance with this URL already exists: {{instanceName}}",
                        { instanceName: exitedAdexInstanceByUrl.name }
                    ),
                },
            ];
        }

        // Validate model and save it if there're no errors
        const modelValidations = instance.validate();
        if (modelValidations.length > 0) return modelValidations;

        await this.instanceRepository.save(instance);

        return [];
    }
}
