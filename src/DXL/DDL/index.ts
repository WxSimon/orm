import { default as sqlite } from './sqlite'

export function getDDL (
    type: FxDbDriverNS.Driver['type'],
): typeof sqlite {
    switch (type) {
        case 'sqlite':
            return sqlite
        default:
            return sqlite
    }
}