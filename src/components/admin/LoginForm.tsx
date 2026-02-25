import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Input } from "../ui";
import { EyeIcon, EyeOffIcon } from "@heroicons/react/solid";

const LoginSchema = z.object({
    email: z.string()
        .email("Email must be a valid email address")
        .min(1, "Email is required"),
    password: z.string().min(1, "Password is required"),
    remember: z.boolean().default(true)
});

type LoginValues = z.infer<typeof LoginSchema>;

interface LoginFormProps {
    onSubmit?: (email: string, password: string) => unknown;
}

export default function LoginForm({ onSubmit }: LoginFormProps) {
    const [showPassword, setShowPassword] = useState(false);

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors, isSubmitting }
    } = useForm({
        resolver: zodResolver(LoginSchema),
        defaultValues: {
            email: "",
            password: "",
            remember: true
        }
    });

    const handleFormSubmit = async (values: LoginValues) => {
        console.log('Form submitted with values:', values);
        console.log('Email value:', values.email);
        console.log('Password value:', values.password);
        console.log('Email length:', values.email?.length);
        console.log('Password length:', values.password?.length);
        if (!onSubmit) return;
        await onSubmit(values.email, values.password);
    };

    const togglePasswordVisibility = () => {
        setShowPassword((show) => !show);
    };

    console.log('Form errors:', errors);
    console.log('Form values:', watch());
    return (
        <form autoComplete="off" noValidate onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
            <Input
                label="Email address"
                type="email"
                autoComplete="username"
                {...register("email")}
                error={errors.email?.message}
            />

            <div className="relative">
                <Input
                    label="Password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    {...register("password")}
                    error={errors.password?.message}
                />
                <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    {showPassword ? (
                        <EyeOffIcon className="w-5 h-5" />
                    ) : (
                        <EyeIcon className="w-5 h-5" />
                    )}
                </button>
            </div>

            <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2">
                    <input
                        type="checkbox"
                        {...register("remember")}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Remember me</span>
                </label>
            </div>

            <Button
                type="submit"
                loading={isSubmitting}
                className="w-full"
            >
                Login
            </Button>
        </form>
    );
}
