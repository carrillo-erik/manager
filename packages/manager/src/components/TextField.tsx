import KeyboardArrowDown from '@mui/icons-material/KeyboardArrowDown';
import { clamp } from 'ramda';
import * as React from 'react';
import { CircleProgress } from 'src/components/CircleProgress';
import FormHelperText from 'src/components/core/FormHelperText';
import InputAdornment from 'src/components/core/InputAdornment';
import InputLabel from 'src/components/core/InputLabel';
import { makeStyles } from 'tss-react/mui';
import { Theme } from '@mui/material/styles';
import {
  default as _TextField,
  StandardTextFieldProps,
} from '@mui/material/TextField';
import { TooltipProps as _TooltipProps } from 'src/components/core/Tooltip';
import { TooltipIcon } from 'src/components/TooltipIcon/TooltipIcon';
import { convertToKebabCase } from 'src/utilities/convertToKebobCase';

const useStyles = makeStyles()((theme: Theme) => ({
  helpWrapper: {
    display: 'flex',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
  },
  wrapper: {
    marginTop: theme.spacing(2),
  },
  noTransform: {
    transform: 'none',
  },
  label: {
    fontFamily: theme.font.normal,
  },
  helperTextTop: {
    marginBottom: theme.spacing(),
    marginTop: theme.spacing(),
  },
  helpWrapperContainer: {
    display: 'flex',
    width: '100%',
  },
  expand: {
    maxWidth: '100%',
  },
  root: {
    marginTop: 0,
  },
  helpWrapperTextField: {
    width: '415px',
  },
  errorText: {
    display: 'flex',
    alignItems: 'center',
    color: theme.color.red,
    top: 42,
    left: 5,
    width: '100%',
  },
  editable: {
    wordBreak: 'keep-all',
    paddingLeft: 1,
  },
  absolute: {
    position: 'absolute',
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
  helperTextPosition?: 'top' | 'bottom';
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
  value?: Value;
}

type Value = string | number | undefined | null;

interface ToolTipProps {
  tooltipPosition?: _TooltipProps['placement'];
  tooltipText?: string | JSX.Element;
  tooltipInteractive?: boolean;
  tooltipClasses?: string;
  tooltipOnMouseEnter?: React.MouseEventHandler<HTMLDivElement>;
}

interface TextFieldPropsOverrides extends StandardTextFieldProps {
  // We override this prop to make it required
  label: string;
}

export type TextFieldProps = BaseProps & TextFieldPropsOverrides & ToolTipProps;

export const TextField = (props: TextFieldProps) => {
  const { classes, cx } = useStyles();

  const {
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
    InputLabelProps,
    inputProps,
    InputProps,
    label,
    loading,
    max,
    min,
    noMarginTop,
    onChange,
    optional,
    required,
    SelectProps,
    tooltipPosition,
    tooltipText,
    tooltipClasses,
    tooltipInteractive,
    tooltipOnMouseEnter,
    type,
    value,
    ...textFieldProps
  } = props;

  const [_value, setValue] = React.useState<Value>(value);

  React.useEffect(() => {
    setValue(value);
  }, [value]);

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
      <InputLabel
        data-qa-textfield-label={label}
        className={cx({
          [classes.wrapper]: noMarginTop ? false : true,
          [classes.noTransform]: true,
          'visually-hidden': hideLabel,
        })}
        htmlFor={validInputId}
      >
        {label}
        {required ? (
          <span className={classes.label}> (required)</span>
        ) : optional ? (
          <span className={classes.label}> (optional)</span>
        ) : null}
      </InputLabel>

      {helperText && helperTextPosition === 'top' && (
        <FormHelperText
          data-qa-textfield-helper-text
          className={classes.helperTextTop}
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
          variant="standard"
          error={!!error || !!errorText}
          /**
           * Set _helperText_ and _label_ to no value because we want to
           * have the ability to put the helper text under the label at the top.
           */
          label={''}
          helperText={''}
          fullWidth
          /*
           * Let us explicitly pass an empty string to the input
           * See UserDefinedFieldsPanel.tsx for a verbose explanation why.
           */
          value={_value}
          onChange={handleChange}
          InputLabelProps={{
            ...InputLabelProps,
            required: false,
            shrink: true,
          }}
          inputProps={{
            'data-testid': 'textfield-input',
            id: validInputId,
            ...inputProps,
          }}
          InputProps={{
            disableUnderline: true,
            endAdornment: loading && (
              <InputAdornment position="end">
                <CircleProgress mini />
              </InputAdornment>
            ),
            className: cx(
              'input',
              {
                [classes.expand]: expand,
              },
              className
            ),
            ...InputProps,
          }}
          SelectProps={{
            disableUnderline: true,
            IconComponent: KeyboardArrowDown,
            MenuProps: {
              anchorOrigin: { vertical: 'bottom', horizontal: 'left' },
              transformOrigin: { vertical: 'top', horizontal: 'left' },
              MenuListProps: { className: 'selectMenuList' },
              PaperProps: { className: 'selectMenuDropdown' },
            },
            ...SelectProps,
          }}
          className={cx(
            {
              [classes.root]: true,
              [classes.helpWrapperTextField]: Boolean(tooltipText),
            },
            className
          )}
          type={type}
        >
          {children}
        </_TextField>
        {tooltipText && (
          <TooltipIcon
            classes={{ popper: tooltipClasses }}
            text={tooltipText}
            tooltipPosition={tooltipPosition}
            interactive={tooltipInteractive}
            onMouseEnter={tooltipOnMouseEnter}
            status="help"
            sxTooltipIcon={{
              padding: '0px 0px 0px 8px',
            }}
          />
        )}
      </div>
      {errorText && (
        <FormHelperText
          className={cx({
            [classes.errorText]: true,
            [classes.editable]: editable,
            [classes.absolute]: editable || hasAbsoluteError,
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
