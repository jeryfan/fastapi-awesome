export interface ApiResponse<T> {
    code: number;
    message: string;
    data?: T;
}

export interface MessageResponse {
    code: number;
    message: string;
}
