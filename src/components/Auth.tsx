
import { useState } from "react";
import { supabase } from "../lib/supabase";

function Auth() {
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [message, setMessage] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(false);

    async function handleLogin() {
        setMessage("");
        setIsLoading(true);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                setMessage(`Anmeldung fehlgeschlagen: ${error.message}`);
            } else {
                setMessage("Anmeldung erfolgreich!");
            }
        } catch {
            setMessage("Ein unerwarteter Fehler ist aufgetreten.");
        } finally {
            setIsLoading(false);
        }
    }

    async function handleSignUp() {
        if (!email.trim() || !password) {
            setMessage("Bitte gib eine E-Mail-Adresse und ein Passwort ein.");
            return;
        }
        setMessage("");
        setIsLoading(true);

        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password
            });

            if (error) {
                setMessage(`Registrierung fehlgeschlagen: ${error.message}`);
            } else if (data.session) {
                setMessage("Registrierung erfolgreich! Du bist angemeldet.");
            } else {
                setMessage(
                    "Registrierung verarbeitet. Bitte bestätige deine E-Mail Adresse."
                );
            }
        } catch {
            setMessage("Ein unerwarteter Fehler ist aufgetreten.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div>
            <h2>Anmelden oder registrieren</h2>

            <input
                type="email"
                placeholder="E-Mail-Adresse"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
            />

            <input
                type="password"
                placeholder="Passwort"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
            />

            <div>
                <button
                    onClick={handleLogin}
                    disabled={isLoading}
                >
                    Anmelden
                </button>

                <button
                    onClick={handleSignUp}
                    disabled={isLoading}
                >
                    Registrieren
                </button>
            </div>

            {message && (
                <p role="status">{message}</p>
            )}
        </div>
    );
}

export default Auth;
