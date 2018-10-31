import bcrypt from "bcryptjs";

export const passwordEncoder = {
    encode: async password => await bcrypt.hash(password, 10),
    verify: async (x, y) => await bcrypt.compare(x, y)
};