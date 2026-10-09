import FormField from "./FormField.jsx";
import Select from "../common/Select.jsx";

const DEFAULT_COUNTRIES = [
  { value: "US", label: "United States" },
  { value: "GB", label: "United Kingdom" },
  { value: "CA", label: "Canada" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "JP", label: "Japan" },
  { value: "NG", label: "Nigeria" },
  { value: "TR", label: "Türkiye" },
  { value: "AU", label: "Australia" },
];

const AddressFields = ({
  value = {},
  onChange,
  errors = {},
  disabled = false,
  required = false,
  countries = DEFAULT_COUNTRIES,
  className = "",
}) => {
  const address = {
    line1: value?.line1 ?? "",
    line2: value?.line2 ?? "",
    city: value?.city ?? "",
    state: value?.state ?? "",
    postalCode: value?.postalCode ?? "",
    country: value?.country ?? "",
  };

  const updateField = (field, nextValue) => {
    onChange?.({
      ...address,
      [field]: nextValue,
    });
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <FormField
        id="address-line1"
        name="line1"
        label="Address line 1"
        value={address.line1}
        onChange={(event) =>
          updateField("line1", event.target.value)
        }
        error={errors.line1}
        required={required}
        disabled={disabled}
        autoComplete="address-line1"
        placeholder="Street address"
      />

      <FormField
        id="address-line2"
        name="line2"
        label="Address line 2"
        value={address.line2}
        onChange={(event) =>
          updateField("line2", event.target.value)
        }
        error={errors.line2}
        disabled={disabled}
        autoComplete="address-line2"
        placeholder="Apartment, suite, unit, etc. (optional)"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          id="address-city"
          name="city"
          label="City"
          value={address.city}
          onChange={(event) =>
            updateField("city", event.target.value)
          }
          error={errors.city}
          required={required}
          disabled={disabled}
          autoComplete="address-level2"
          placeholder="City"
        />

        <FormField
          id="address-state"
          name="state"
          label="State / Province"
          value={address.state}
          onChange={(event) =>
            updateField("state", event.target.value)
          }
          error={errors.state}
          required={required}
          disabled={disabled}
          autoComplete="address-level1"
          placeholder="State or province"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          id="address-postal-code"
          name="postalCode"
          label="Postal code"
          value={address.postalCode}
          onChange={(event) =>
            updateField(
              "postalCode",
              event.target.value,
            )
          }
          error={errors.postalCode}
          required={required}
          disabled={disabled}
          autoComplete="postal-code"
          placeholder="Postal code"
        />

        <Select
          id="address-country"
          name="country"
          label="Country"
          value={address.country}
          onChange={(event) =>
            updateField(
              "country",
              event.target.value,
            )
          }
          options={countries}
          placeholder="Select country"
          error={errors.country}
          disabled={disabled}
          required={required}
        />
      </div>
    </div>
  );
};

export default AddressFields;