export interface ApiResponse<T> {
    code: number
    msg: string
    data?: T
}

export interface MessageResponse {
    code: number
    msg: string
}
