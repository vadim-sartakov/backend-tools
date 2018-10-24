import bcrypt from "bcryptjs";

class Model {
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
        const tokenDoc = token.toObject();
        return tokenDoc;
    }
    async revokeToken(token) {
        return await this.Token.findOneAndRemove({ accessToken: token.accessToken });
    }
    async getClient(_id, secret) {
        const client = await this.Client.findOne({ _id });
        if (!client) return;
        const clientDoc = client.toObject();
        // In auth code flow secret is null, and we don't want to check it
        if (secret === null) return clientDoc;
        const validSecret = await bcrypt.compare(secret, clientDoc.secret);
        return validSecret && clientDoc;
    }
    async getRefreshToken(refreshToken) {
        const token = await this.Token.findOne({ refreshToken });
        if (!token) return;
        const tokenDoc = token.toObject();
        return tokenDoc;
    }
    async getUser(username, password) {
        const user = await this.User.findOne({ username }).lean();
        const validPassword = await bcrypt.compare(password, user.password);
        return validPassword && user;
    }
    async saveAuthorizationCode(authorizationCode, client, user) {
        const authCodeInstance = new this.AuthorizationCode({
            ...authorizationCode,
            client: client._id,
            user: user.id
        });
        return await authCodeInstance.save();
    }
    async getAuthorizationCode(authorizationCode) {
        const code = await this.AuthorizationCode.findOne({ authorizationCode });
        const codeDoc = code.toObject();
        return codeDoc;
    }
    async revokeAuthorizationCode(authCodeInstance) {
        return await this.AuthorizationCode.findOneAndRemove({ authorizationCode: authCodeInstance.authorizationCode }).lean();
    }
}

export default Model;