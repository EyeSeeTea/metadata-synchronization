import { Ref } from "../../../types/d2-api";

/**
 * Models to use by EventsPayloadMapper
 */

export interface ProgramStageRef {
    id: string;
    program: Ref;
}

export function toProgramStageRefs(programs: { id: string; programStages?: Ref[] }[]): ProgramStageRef[] {
    return programs.flatMap(program =>
        (program.programStages ?? []).map(({ id }) => ({ id, program: { id: program.id } }))
    );
}
