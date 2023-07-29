import React from "react";

const InputCheckbox = ({
    onChange,
    labelAfter,
    // labelBefore,
    paraAfter,
    // paraBefore,
    checked,
    className = "",
    disabled = false,
    title,
}: {
    labelAfter?: string;
    // labelBefore?: string;
    paraAfter?: string;
    // paraBefore?: string;
    checked: boolean;
    onChange: React.ChangeEventHandler<HTMLInputElement>;
    className?: string;
    disabled?: boolean;
    title?: string;
}) => {
    if (!labelAfter && !paraAfter) console.error("Element must have either label or para.");
    return (
        <label
            title={title}
            className={(disabled ? "disabled " : "") + (checked ? "optionSelected " : "") + className}
        >
            {/* {labelBefore}
            {paraBefore && <p>{paraBefore}</p>} */}
            <span className={`toggle-area ${checked ? "on" : "off"} `}>
                <span className={`toggle-state`}></span>
            </span>
            <input type="checkbox" checked={checked} disabled={disabled} onChange={onChange} />
            {paraAfter && <p dangerouslySetInnerHTML={{ __html: paraAfter }}></p>}
            {labelAfter}
        </label>
    );
};

export default InputCheckbox;
