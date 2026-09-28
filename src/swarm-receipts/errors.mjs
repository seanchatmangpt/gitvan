export class ReceiptRefusal extends Error { constructor(code,message,details={}){super(message);this.name='ReceiptRefusal';this.code=code;this.details=details;} }
export const refuse=(code,message,details)=>{throw new ReceiptRefusal(code,message,details)};
