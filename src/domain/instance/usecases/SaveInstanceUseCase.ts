import i18n from "../../../utils/i18n";
import { UseCase } from "../../common/entities/UseCase";
import { ValidationError } from "../../common/entities/Validations";
import { Instance } from "../entities/Instance";
import { InstanceRepository } from "../repositories/InstanceRepository";

export class SaveInstanceUseCase implements UseCase {
    constructor(private instanceRepository: InstanceRepository) {}

    public async execute(instance: Instance): Promise<ValidationError[]> {
        const instanceByName = await this.instanceRepository.getByName(instance.name);

        if (instanceByName && instanceByName.id !== instance.id) {
            return [
                {
                    property: "name",
                    error: "name_exists",
                    description: i18n.t("An instance with this name already exists"),
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
