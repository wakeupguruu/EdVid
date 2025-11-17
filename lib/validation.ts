export interface ValidationError{
    field: string;
    message: string;
}

export class ValidationErrors extends Error{
    constructor(public errors: ValidationError[]){
        super("Validation failed");
        this.name = "ValidationError";
    }
}

export const validators = {
    prompt: (prompt: string): string => {
        if (typeof prompt != "string" || prompt.trim().length === 0){
            throw new ValidationErrors([
                {field: "prompt", message: "Prompt must be a non-empty string"}
            ]);
        }

        const trimmed = prompt.trim();

        if(trimmed.length < 10){
            throw new ValidationErrors([
                { field: "prompt", message: "Prompt must be at least 10 characters long" }
            ])
        }

        if(trimmed.length > 2000){
            throw new ValidationErrors([
                {field: "prompt", message: "Prompt must be at most 2000 characters long" }
            ])
        }
        return trimmed;
    },

    id: (id: string): string =>{
        if (typeof id != "string" || id.trim().length === 0){
            throw new ValidationErrors([
                {field: "id", message: "ID must be a non-empty string"}
            ]);
        }

            if (!/^[a-z0-9]+$/.test(id) || id.length < 20) {
        throw new ValidationErrors([
            { field: 'id', message: 'Invalid ID format' },
        ]);
        }
        return id;
    }
};