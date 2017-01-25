import Theater from "./theater";
import MultilingualString from "./multilingualString";
export interface Seat {
    code: string
}
export interface Section {
    code: string,
    name: MultilingualString,
    seats: Array<Seat>
}

export default class Screen {
    constructor(
        readonly _id: string,
        readonly theater: Theater,
        readonly coa_screen_code: string,
        readonly name: MultilingualString,
        readonly sections: Array<Section>
    ) {
        // TODO validation
    }
}