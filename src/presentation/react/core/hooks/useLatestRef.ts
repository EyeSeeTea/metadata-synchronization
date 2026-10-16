import { useEffect, useRef } from "react";

// Keeps a ref synced to the latest value so callbacks can read the freshest value
// synchronously instead of capturing a stale closure.
export function useLatestRef<T>(value: T) {
    const ref = useRef(value);

    useEffect(() => {
        ref.current = value;
    }, [value]);

    return ref;
}
