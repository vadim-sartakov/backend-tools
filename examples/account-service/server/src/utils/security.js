import bcrypt from "bcryptjs";

export const passwordEncoder = {
    encode: async password => await bcrypt.hash(password, 10),
    encodeSync: password => bcrypt.hashSync(password, 10),
    verify: async (x, y) => await bcrypt.compare(x, y),
    verifySync: (x, y) => bcrypt.compareSync(x, y)
};