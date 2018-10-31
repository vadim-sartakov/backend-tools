import jwt from "jsonwebtoken";
import { passwordEncoder } from "../utils/security";

export class MongoModel {
    constructor({ Token, Client, User, AuthorizationCode }) {
        this.Token = Token;
        this.Client = Client;
        this.User = User;
        this.AuthorizationCode = AuthorizationCode;
    }
    async saveToken(token, client, user) {
        const accessToken = new this.Token({
            ...token,
            client: client._id,
            user: user._id
        });
        return await accessToken.save();
    }
    async getAccessToken(accessToken) {
        const token = await this.Token.findOne({ accessToken });
        if (!token) return;
        token.client.id = token.client._id.toHexString();
        return token;
    }
    async revokeToken(token) {
        return await this.Token.findOneAndRemove({ accessToken: token.accessToken });
    }
    async getClient(_id, secret) {
        const client = await this.Client.findOne({ _id });
        if (!client) return;
        client.id = client._id.toHexString();
        // In auth code flow secret is null, and we don't want to check it
        if (secret === null) return client;
        const validSecret = await passwordEncoder.verify(secret, client.secret);
        return validSecret && client;
    }
    async getRefreshToken(refreshToken) {
        const token = await this.Token.findOne({ refreshToken });
        if (!token) return;
        token.client.id = token.client._id.toHexString();
        return token;
    }
    async getUser(username, password) {
        const user = await this.User.findOne({ "accounts.type" : "local", "accounts.id": username });
        if (!user) return;
        const validPassword = await passwordEncoder.verify(password, user.password);
        return validPassword && user;
    }
    async saveAuthorizationCode(authorizationCode, client, user) {
        const authCodeInstance = new this.AuthorizationCode({
            ...authorizationCode,
            client: client._id,
            user: user._id
        });
        return await authCodeInstance.save();
    }
    async getAuthorizationCode(authorizationCode) {
        const code = await this.AuthorizationCode.findOne({ authorizationCode });
        if (!code) return;
        code.client.id = code.client._id.toHexString();
        return code;
    }
    async revokeAuthorizationCode(authCodeInstance) {
        return await this.AuthorizationCode.findOneAndRemove({ authorizationCode: authCodeInstance.authorizationCode }).lean();
    }
}

export class JwtModel extends MongoModel {
    constructor(models, keys, jwtOpts, tokenLifetime) {
        super(models);
        this.keys = keys;
        this.jwtOpts = jwtOpts;
        this.tokenLifetime = tokenLifetime;
    }
    async generateAccessToken(client, user) {
        return jwt.sign({
            user: { id: user._id, roles: user.roles },
            client: { id: client._id, scopes: client.scopes }
        },
        this.keys.private,
        { expiresIn: this.tokenLifetime.accessToken, ...this.jwtOpts });
    }
    // Refresh token should not reset lifetime
    async generateRefreshToken(client, user) {
        return jwt.sign({
            user: { id: user._id, roles: user.roles },
            client: { id: client._id, scopes: client.scopes },
            refresh: true
        },
        this.keys.private,
        { expiresIn: this.tokenLifetime.refreshToken, ...this.jwtOpts });
    }
    saveToken(token, client, user) {
        return { ...token, client, user };
    }
    getAccessToken(accessToken) {
        const payload = jwt.verify(accessToken, this.keys.public);
        if (payload.refresh) return;
        payload.accessTokenExpiresAt = new Date(payload.exp * 1000);
        return payload;
    }
    getRefreshToken(refreshToken) {
        const payload = jwt.verify(refreshToken, this.keys.public);
        payload.refreshTokenExpiresAt = new Date(payload.exp * 1000);
        return payload;
    }
    revokeToken(token) {
        return token;
    }
}