import KeyboardArrowDown from '@mui/icons-material/KeyboardArrowDown';
import {
  default as _TextField,
  StandardTextFieldProps,
} from '@mui/material/TextField';
import { Theme } from '@mui/material/styles';
import { clamp } from 'ramda';
import * as React from 'react';
import { makeStyles } from 'tss-react/mui';

import { Box } from 'src/components/Box';
import { CircleProgress } from 'src/components/CircleProgress';
import { FormHelperText } from 'src/components/FormHelperText';
import { InputAdornment } from 'src/components/InputAdornment';
import { InputLabel } from 'src/components/InputLabel';
import { TooltipProps } from 'src/components/Tooltip';
import { TooltipIcon } from 'src/components/TooltipIcon';
import { convertToKebabCase } from 'src/utilities/convertToKebobCase';

const useStyles = makeStyles()((theme: Theme) => ({
  absolute: {
    position: 'absolute',
  },
  editable: {
    paddingLeft: 1,
    wordBreak: 'keep-all',
  },
  errorText: {
    alignItems: 'center',
    color: theme.color.red,
    display: 'flex',
    left: 5,
    top: 42,
    width: '100%',
  },
  expand: {
    maxWidth: '100%',
  },
  helpWrapper: {
    alignItems: 'flex-end',
    display: 'flex',
    flexWrap: 'wrap',
  },
  helpWrapperContainer: {
    display: 'flex',
    width: '100%',
  },
  helpWrapperTextField: {
    width: '415px',
  },
  helperTextTop: {
    marginBottom: theme.spacing(),
    marginTop: theme.spacing(),
  },
  label: {
    fontFamily: theme.font.normal,
  },
  noTransform: {
    transform: 'none',
  },
  root: {
    marginTop: 0,
  },
  wrapper: {
    marginTop: theme.spacing(2),
  },
}));

interface BaseProps {
  /**
   * className to apply to the underlying TextField component
   */
  className?: string;
  /**
   * Data attributes are applied to the underlying TextField component for testing purposes
   */
  dataAttrs?: Record<string, any>;
  /**
   * Applies editable styles
   * @default false
   */
  editable?: boolean;
  /**
   * Adds error grouping to TextField
   */
  errorGroup?: string;
  /**
   * When defined, makes the input show an error state with the defined text
   */
  errorText?: string;
  /**
   * Makes the TextField use 100% of the available width
   * @default false
   */
  expand?: boolean;
  /**
   * Makes the error text have the absolute positioning
   * @default false
   */
  hasAbsoluteError?: boolean;
  /**
   * Placement of the `helperText`
   * @default bottom
   */
  helperTextPosition?: 'bottom' | 'top';
  /**
   * Hides the `label`
   * @default false
   */
  hideLabel?: boolean;
  /**
   * Allows you to manually set an htmlFor input id. One will automatically be generated by the `label` if this is unset
   */
  inputId?: string;
  /**
   * Displays a loading spinner at the end of the Text Field
   * @default false
   */
  loading?: boolean;
  /**
   * The maximum number allowed in TextField. The "type" prop must also be set to `number`
   */
  max?: number;
  /**
   * The minimum number allowed in TextField. The "type" prop must also be set to `number`
   */
  min?: number;
  /**
   * Removes the default top margin (16px)
   * @default false
   */
  noMarginTop?: boolean;
  /**
   * Adds `(optional)` to the Label
   * @default false
   */
  optional?: boolean;
  /**
   * Adds `(required)` to the Label
   */
  required?: boolean;
  /**
   * The leading and trailing spacing should be trimmed from the textfield on blur; intended to be used for username, emails, and SSH key input only
   */
  trimmed?: boolean;
  value?: Value;
}

type Value = null | number | string | undefined;

interface LabelToolTipProps {
  labelTooltipText?: JSX.Element | string;
}

interface InputToolTipProps {
  tooltipClasses?: string;
  tooltipInteractive?: boolean;
  tooltipOnMouseEnter?: React.MouseEventHandler<HTMLDivElement>;
  tooltipPosition?: TooltipProps['placement'];
  tooltipText?: JSX.Element | string;
}

interface TextFieldPropsOverrides extends StandardTextFieldProps {
  // We override this prop to make it required
  label: string;
}

export type TextFieldProps = BaseProps &
  TextFieldPropsOverrides &
  LabelToolTipProps &
  InputToolTipProps;

export const TextField = (props: TextFieldProps) => {
  const { classes, cx } = useStyles();

  const {
    InputLabelProps,
    InputProps,
    SelectProps,
    children,
    className,
    dataAttrs,
    editable,
    error,
    errorGroup,
    errorText,
    expand,
    hasAbsoluteError,
    helperText,
    helperTextPosition,
    hideLabel,
    inputId,
    inputProps,
    label,
    labelTooltipText,
    loading,
    max,
    min,
    noMarginTop,
    onBlur,
    onChange,
    optional,
    required,
    tooltipClasses,
    tooltipInteractive,
    tooltipOnMouseEnter,
    tooltipPosition,
    tooltipText,
    trimmed,
    type,
    value,
    ...textFieldProps
  } = props;

  const [_value, setValue] = React.useState<Value>(value);

  React.useEffect(() => {
    setValue(value);
  }, [value]);

  const handleBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    if (trimmed) {
      const trimmedValue = e.target.value.trim();
      e.target.value = trimmedValue;
      setValue(trimmedValue);
    }
    if (onBlur) {
      onBlur(e);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numberTypes = ['tel', 'number'];

    // Because !!0 is falsy :(
    const minAndMaxExist = typeof min === 'number' && typeof max === 'number';

    /**
     * If we've provided a min and max value, make sure the user
     * input doesn't go outside of those bounds ONLY if the input
     * type matches a number type.
     */
    const cleanedValue =
      minAndMaxExist &&
      numberTypes.some((eachType) => eachType === type) &&
      e.target.value !== ''
        ? clamp(min, max, +e.target.value)
        : e.target.value;

    /**
     * If the cleanedValue is undefined, set the value to an empty
     * string but this shouldn't happen.
     */
    setValue(cleanedValue || '');

    // Invoke the onChange prop if one is provided with the cleaned value.
    if (onChange) {
      /**
       * Create clone of event node only if our cleanedValue
       * is different from the e.target.value
       *
       * This solves for a specific scenario where the e.target on
       * the MUI TextField select variants were actually a plain object
       * rather than a DOM node.
       *
       * So e.target on a text field === <input />
       * while e.target on the select variant === { value: 10, name: undefined }
       *
       * See GitHub issue: https://github.com/mui-org/material-ui/issues/16470
       */
      if (e.target.value !== cleanedValue) {
        const clonedEvent = {
          ...e,
          target: e.target.cloneNode(),
        } as React.ChangeEvent<HTMLInputElement>;

        clonedEvent.target.value = `${cleanedValue}`;
        onChange(clonedEvent);
      } else {
        onChange(e);
      }
    }
  };

  let errorScrollClassName = '';

  if (errorText) {
    errorScrollClassName = errorGroup
      ? `error-for-scroll-${errorGroup}`
      : `error-for-scroll`;
  }

  const validInputId =
    inputId || (label ? convertToKebabCase(`${label}`) : undefined);

  return (
    <div
      className={cx({
        [classes.helpWrapper]: Boolean(tooltipText),
        [errorScrollClassName]: !!errorText,
      })}
    >
      <Box display="flex">
        <InputLabel
          className={cx({
            [classes.noTransform]: true,
            [classes.wrapper]: noMarginTop ? false : true,
            'visually-hidden': hideLabel,
          })}
          data-qa-textfield-label={label}
          htmlFor={validInputId}
        >
          {label}
          {required ? (
            <span className={classes.label}> (required)</span>
          ) : optional ? (
            <span className={classes.label}> (optional)</span>
          ) : null}
        </InputLabel>
        {labelTooltipText && (
          <TooltipIcon
            sxTooltipIcon={{
              padding: '8px 0px 0px 8px',
            }}
            status="help"
            text={labelTooltipText}
          />
        )}
      </Box>

      {helperText && helperTextPosition === 'top' && (
        <FormHelperText
          className={classes.helperTextTop}
          data-qa-textfield-helper-text
        >
          {helperText}
        </FormHelperText>
      )}
      <div
        className={cx({
          [classes.helpWrapperContainer]: Boolean(tooltipText),
        })}
      >
        <_TextField
          {...textFieldProps}
          {...dataAttrs}
          InputLabelProps={{
            ...InputLabelProps,
            required: false,
            shrink: true,
          }}
          InputProps={{
            className: cx(
              'input',
              {
                [classes.expand]: expand,
              },
              className
            ),
            disableUnderline: true,
            endAdornment: loading && (
              <InputAdornment position="end">
                <CircleProgress mini />
              </InputAdornment>
            ),
            ...InputProps,
          }}
          SelectProps={{
            IconComponent: KeyboardArrowDown,
            MenuProps: {
              MenuListProps: { className: 'selectMenuList' },
              PaperProps: { className: 'selectMenuDropdown' },
              anchorOrigin: { horizontal: 'left', vertical: 'bottom' },
              transformOrigin: { horizontal: 'left', vertical: 'top' },
            },
            disableUnderline: true,
            ...SelectProps,
          }}
          className={cx(
            {
              [classes.helpWrapperTextField]: Boolean(tooltipText),
              [classes.root]: true,
            },
            className
          )}
          inputProps={{
            'data-testid': 'textfield-input',
            id: validInputId,
            ...inputProps,
          }}
          error={!!error || !!errorText}
          fullWidth
          helperText={''}
          /**
           * Set _helperText_ and _label_ to no value because we want to
           * have the ability to put the helper text under the label at the top.
           */
          label={''}
          onBlur={handleBlur}
          onChange={handleChange}
          type={type}
          /*
           * Let us explicitly pass an empty string to the input
           * See UserDefinedFieldsPanel.tsx for a verbose explanation why.
           */
          value={_value}
          variant="standard"
        >
          {children}
        </_TextField>
        {tooltipText && (
          <TooltipIcon
            sxTooltipIcon={{
              padding: '0px 0px 0px 8px',
            }}
            classes={{ popper: tooltipClasses }}
            interactive={tooltipInteractive}
            onMouseEnter={tooltipOnMouseEnter}
            status="help"
            text={tooltipText}
            tooltipPosition={tooltipPosition}
          />
        )}
      </div>
      {errorText && (
        <FormHelperText
          className={cx({
            [classes.absolute]: editable || hasAbsoluteError,
            [classes.editable]: editable,
            [classes.errorText]: true,
          })}
          data-qa-textfield-error-text={label}
          role="alert"
        >
          {errorText}
        </FormHelperText>
      )}
      {helperText &&
        (helperTextPosition === 'bottom' || !helperTextPosition) && (
          <FormHelperText data-qa-textfield-helper-text>
            {helperText}
          </FormHelperText>
        )}
    </div>
  );
};
