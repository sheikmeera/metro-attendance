const fs = require('fs');
const path = require('path');

const credentials = {
    "type": "service_account",
    "project_id": "metro-attendance-489419",
    "private_key_id": "dd86bae59404229b108accec78f5316afff70073",
    "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDI0suk1QlYcMOV\nKmrnqa1BeVulejAccxq8+GY+CV5pCEpdk+EoTxFMaJ1/NpdonZRTdBzVDkGKjYMo\ncmUVX3+dxM5zgRt3KVfng08M+NpZduu6RkmiBAC14hMLRvSPB/8VM4xVN4VHUcT1\nrcG0phSrE55OvIJDpEoHBVBVHJd9/a4E0OGzte08U8/M1suOEam5N73y/t1EBXfB\n8bPdB2vVK7+rpBHK4iZePNcvyt/zWTVb+Us/6Yd/ywS3R1iwOnfFETso0fP/vN+7\n63lQzq+/dDvv25kGdRr92vF39CUYo9D7Sk/8jWJh93RKskKGkh/TbJ4DMjeWBh05\nPdpnm+clAgMBAAECggEAAcQ871vCY8lGJytC2nvXHtLS+A8tmip3Cz+CIryRXIoq\noU0aN3EOnWX0MLjJty1fryY/1K317KKXC0WKVxhKdphTGpgBplgyQkKY8OvFe/D8\nXNyebDLt0KvG8Bv1LcbruwODkgJVhU2WVnTrVcv6NZEMHPQyjybEUfB9huoj+QM8\nwod0DqXYTOL3RfYQVKZGtZ/s4V9bu8l942hmoXZkpQxzYWyKzJxYaByix1qSfdJT\nyTdscTy/dwmewACsIXnRkGovEM7nBq0Ur57l3hdovREgL73NH0oFNegUZdeOnGnW\nGg6Qy4U4MkOivfzM/khI8YsEteBTUzOpcdzNhg+GVwKBgQD2BNfvSgejWexmYtlk\le+XKaZUtr86H9goi1B42axGWBzSUY3F3IIStx4Ih4dH7ONkwIYLWO4Nioify274\OeQLJATvCElk55zejP9l0QxmbpOsWBporG9gw+4jK+xt2ubMDRwUmdcJtbDQCBbf\nCEBja8hy/zJr5MPk+3q91G+9cwKBgQDQ+I0Ak+jtatV3qAIoQyGw6W4bK7ZgPvFI\nmNxF9AaBb0AG8OEh5lFqQ2kDgUDGstXn5qAHb3IsHvaN8TVZEcfdGCryNWsaRZf2\nNuDCBNqQJ2r+qqHxeidBB9bpa1s4QN7C0CHdNPe/s61wQCVHCWiBMwmF31kvJkYm\nsKnZzf0jBwKBgQCQC13zOUEnn6sOd6oZfsB9nWFKEIX+nk6NzqQbXjfEKCsX6bA8\nvVNbaeQn0lKfBlBN2XuigTtAqnA8P3yF0j93VmudGRj//6yVkbCoCLJd9zh3nE46\nI1xDJ/TymvEfkR+5MaPTXA/QG5We+F2L0OUCUUVYL5tyGMup8qR3KT8TiQKBgFUL\n0tbZW4LEZ/w6tCYOrDeDyPvl3mNtOmWBUKRnm/4xeK1ae0WApsHIjYSPpf036zZl\n9dsQ0DaEo3NBJ6UIR38DxvasJtqaWC4sR2yu7QSeBj1+1EminTcqKZz1xDowrHg8\nnIuacvnh9kQo1wMCITXzv3xsWa+GtCYq3/V0kAEhAoGBANNB7M/UR2IH8pIV+qQD\n9m1gIGLanCsl28oTvGziZpByQFnoTu+smcLbFBCQ9LpLyb5JWVkfo9dKbQTnUsUk\nFqo4umaAUzKP7MakCv5ZAr4YciRp2H4ZAOgHhq+SMhjGr6lEJHtPfX8brfspHZsw\nhSbCX4yYL6cq7BJQ9u2g+Ccf\n-----END PRIVATE KEY-----\n",
    "client_email": "metro-drive-sync@metro-attendance-489419.iam.gserviceaccount.com",
    "client_id": "114895956839450479953",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/metro-drive-sync%40metro-attendance-489419.iam.gserviceaccount.com",
    "universe_domain": "googleapis.com"
};

fs.writeFileSync(path.join(__dirname, 'server', 'service_account.json'), JSON.stringify(credentials, null, 2));
console.log('Successfully wrote service_account.json');
