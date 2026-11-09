import { createContext } from 'react';

/** يستدعيه TextField عند التركيز ليتأكد AuthScaffold أن الحقل ظاهر فوق الكيبورد */
export const RevealContext = createContext<() => void>(() => {});
