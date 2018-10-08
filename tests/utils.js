let portCounter = 6000;

export const getNextPort = () => portCounter++;

export const expectedLinks = ({ first, prev, next, last, size, port }) => 
        `<http://127.0.0.1:${port}/users?page=${first}&size=${size}>; rel=first, ` +
        `${prev !== undefined ? `<http://127.0.0.1:${port}/users?page=${prev}&size=${size}>; rel=previous, ` : ""}` +
        `${next !== undefined ? `<http://127.0.0.1:${port}/users?page=${next}&size=${size}>; rel=next, ` : ""}` +
        `<http://127.0.0.1:${port}/users?page=${last}&size=${size}>; rel=last`;