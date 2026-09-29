import { Transform } from 'class-transformer';

/** Query strings arrive as 'true' / 'false'; anything else is left for @IsBoolean to reject. */
export const ToBoolean = () =>
  Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value));
