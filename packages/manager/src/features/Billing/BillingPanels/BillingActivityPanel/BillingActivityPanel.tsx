import { getInvoiceItems } from '@linode/api-v4/lib/account';
import Paper from '@mui/material/Paper';
import { styled } from '@mui/material/styles';
import Grid from '@mui/material/Unstable_Grid2';
import { DateTime } from 'luxon';
import * as React from 'react';
import { makeStyles } from 'tss-react/mui';

import { Autocomplete } from 'src/components/Autocomplete/Autocomplete';
import { Currency } from 'src/components/Currency';
import { DateTimeDisplay } from 'src/components/DateTimeDisplay';
import { InlineMenuAction } from 'src/components/InlineMenuAction/InlineMenuAction';
import { Link } from 'src/components/Link';
import OrderBy from 'src/components/OrderBy';
import Paginate from 'src/components/Paginate';
import { PaginationFooter } from 'src/components/PaginationFooter/PaginationFooter';
import { Table } from 'src/components/Table';
import { TableBody } from 'src/components/TableBody';
import { TableCell } from 'src/components/TableCell';
import { TableContentWrapper } from 'src/components/TableContentWrapper/TableContentWrapper';
import { TableHead } from 'src/components/TableHead';
import { TableRow } from 'src/components/TableRow';
import { TextTooltip } from 'src/components/TextTooltip';
import { Typography } from 'src/components/Typography';
import { ISO_DATETIME_NO_TZ_FORMAT } from 'src/constants';
import { getShouldUseAkamaiBilling } from 'src/features/Billing/billingUtils';
import {
  printInvoice,
  printPayment,
} from 'src/features/Billing/PdfGenerator/PdfGenerator';
import { useFlags } from 'src/hooks/useFlags';
import { useSet } from 'src/hooks/useSet';
import { useAccount } from 'src/queries/account/account';
import {
  useAllAccountInvoices,
  useAllAccountPayments,
} from 'src/queries/account/billing';
import { useProfile } from 'src/queries/profile/profile';
import { useRegionsQuery } from 'src/queries/regions/regions';
import { parseAPIDate } from 'src/utilities/date';
import { formatDate } from 'src/utilities/formatDate';
import { getAll } from 'src/utilities/getAll';

import { getTaxID } from '../../billingUtils';

import type { Invoice, InvoiceItem, Payment } from '@linode/api-v4/lib/account';
import type { Theme } from '@mui/material/styles';

const useStyles = makeStyles()((theme: Theme) => ({
  activeSince: {
    marginRight: theme.spacing(1.25),
    marginTop: theme.spacing(5.5),
  },
  dateColumn: {
    width: '25%',
  },
  descriptionColumn: {
    width: '25%',
  },
  flexContainer: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
  },
  headerContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    [theme.breakpoints.down('sm')]: {
      alignItems: 'flex-start',
      flexDirection: 'column',
    },
  },
  headerLeft: {
    display: 'flex',
    flexGrow: 2,
    [theme.breakpoints.down('sm')]: {
      paddingLeft: 0,
    },
  },
  headerRight: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 5,
    [theme.breakpoints.down('sm')]: {
      alignItems: 'flex-start',
      flexDirection: 'column',
      marginLeft: 15,
      paddingLeft: 0,
    },
  },
  headline: {
    fontSize: '1rem',
    lineHeight: '1.5rem',
  },
  pdfDownloadColumn: {
    '& > .loading': {
      width: 115,
    },
    textAlign: 'right',
  },
  pdfError: {
    color: theme.color.red,
  },
  root: {
    padding: `15px 0px 15px 20px`,
  },
  totalColumn: {
    [theme.breakpoints.up('md')]: {
      textAlign: 'right',
      width: '10%',
    },
  },
  transactionDate: {
    width: 130,
  },
  transactionType: {
    marginRight: theme.spacing(),
    width: 200,
  },
}));

interface ActivityFeedItem {
  date: string;
  id: number;
  label: string;
  total: number;
  type: 'invoice' | 'payment';
}

interface TransactionTypeOptions {
  label: string;
  value: 'all' | 'invoice' | 'payment';
}

const transactionTypeOptions: TransactionTypeOptions[] = [
  { label: 'Invoices', value: 'invoice' },
  { label: 'Payments', value: 'payment' },
  { label: 'All Transaction Types', value: 'all' },
];

interface TransactionDateOptions {
  label: string;
  value:
    | '6 Months'
    | '12 Months'
    | '30 Days'
    | '60 Days'
    | '90 Days'
    | 'All Time';
}

export const transactionDateOptions: TransactionDateOptions[] = [
  { label: '30 Days', value: '30 Days' },
  { label: '60 Days', value: '60 Days' },
  { label: '90 Days', value: '90 Days' },
  { label: '6 Months', value: '6 Months' },
  { label: '12 Months', value: '12 Months' },
  { label: 'All Time', value: 'All Time' },
];

const AkamaiBillingInvoiceText = (
  <Typography>
    Charges in the final Akamai invoice should be considered the final source
    truth. Linode invoice will not reflect discounting, currency adjustment, or
    any negotiated terms and conditions. Condensed and finalized invoice is
    available within{' '}
    <Link to="https://control.akamai.com/apps/billing">
      Akamai Control Center &gt; Billing
    </Link>
    .
  </Typography>
);

// =============================================================================
// <BillingActivityPanel />
// =============================================================================
export interface Props {
  accountActiveSince?: string;
}

export const BillingActivityPanel = React.memo((props: Props) => {
  const { accountActiveSince } = props;
  const { data: profile } = useProfile();
  const { data: account } = useAccount();
  const { data: regions } = useRegionsQuery();
  const isAkamaiCustomer = account?.billing_source === 'akamai';
  const { classes } = useStyles();
  const flags = useFlags();
  const pdfErrors = useSet();
  const pdfLoading = useSet();

  const [
    selectedTransactionType,
    setSelectedTransactionType,
  ] = React.useState<TransactionTypeOptions>(transactionTypeOptions[2]);

  const [
    selectedTransactionDate,
    setSelectedTransactionDate,
  ] = React.useState<TransactionDateOptions>(transactionDateOptions[3]);

  const endDate = getCutoffFromDateRange(selectedTransactionDate);
  const filter = makeFilter(endDate);

  const {
    data: payments,
    error: accountPaymentsError,
    isLoading: accountPaymentsLoading,
  } = useAllAccountPayments({}, filter);

  const {
    data: invoices,
    error: accountInvoicesError,
    isLoading: accountInvoicesLoading,
  } = useAllAccountInvoices({}, filter);

  const downloadInvoicePDF = React.useCallback(
    (invoiceId: number) => {
      const invoice = invoices?.find(
        (thisInvoice) => thisInvoice.id === invoiceId
      );

      const id = `invoice-${invoiceId}`;

      // TS Safeguard.
      if (!account || !invoice) {
        pdfErrors.add(id);
        return;
      }

      const taxes =
        flags[getShouldUseAkamaiBilling(invoice.date) ? 'taxes' : 'taxBanner'];

      pdfErrors.delete(id);
      pdfLoading.add(id);

      getAllInvoiceItems(invoiceId)
        .then(async (invoiceItems) => {
          pdfLoading.delete(id);

          const result = await printInvoice({
            account,
            invoice,
            items: invoiceItems,
            regions: regions ?? [],
            taxes,
          });

          if (result.status === 'error') {
            pdfErrors.add(id);
          }
        })
        .catch(() => {
          pdfLoading.delete(id);
          pdfErrors.add(id);
        });
    },
    [account, flags, invoices, pdfErrors, pdfLoading, regions]
  );

  const downloadPaymentPDF = React.useCallback(
    (paymentId: number) => {
      const payment = payments?.find(
        (thisPayment) => thisPayment.id === paymentId
      );

      const id = `payment-${paymentId}`;

      // TS Safeguard.
      if (!account || !payment) {
        pdfErrors.add(id);
        return;
      }

      const taxes =
        flags[getShouldUseAkamaiBilling(payment.date) ? 'taxes' : 'taxBanner'];

      pdfErrors.delete(id);

      const countryTax = getTaxID(
        payment.date,
        taxes?.date,
        taxes?.country_tax
      );
      const result = printPayment(account, payment, countryTax);

      if (result.status === 'error') {
        pdfErrors.add(id);
      }
    },
    [payments, flags, account, pdfErrors]
  );

  // Combine Invoices and Payments
  const combinedData = React.useMemo(
    () => [
      ...(invoices?.map(invoiceToActivityFeedItem) ?? []),
      ...(payments?.map(paymentToActivityFeedItem) ?? []),
    ],
    [invoices, payments]
  );

  // Filter on transaction type
  const filteredData = React.useMemo(() => {
    return combinedData.filter(
      (thisBillingItem) =>
        thisBillingItem.type === selectedTransactionType.value
    );
  }, [selectedTransactionType, combinedData]);

  return (
    <Grid data-qa-billing-activity-panel xs={12}>
      <Paper variant="outlined">
        <div className={classes.root}>
          <StyledBillingAndPaymentHistoryHeader
            className={classes.headerContainer}
          >
            <Typography className={classes.headline} variant="h2">
              {`${isAkamaiCustomer ? 'Usage' : 'Billing & Payment'} History`}
            </Typography>
            {isAkamaiCustomer ? (
              <div className={classes.headerLeft}>
                <TextTooltip
                  displayText="Usage History may not reflect finalized invoice"
                  sxTypography={{ paddingLeft: '4px' }}
                  tooltipText={AkamaiBillingInvoiceText}
                />
              </div>
            ) : null}
            <div className={classes.headerRight}>
              {accountActiveSince && (
                <div className={classes.flexContainer}>
                  <Typography className={classes.activeSince} variant="body1">
                    Account active since{' '}
                    {formatDate(accountActiveSince, {
                      displayTime: false,
                      timezone: profile?.timezone,
                    })}
                  </Typography>
                </div>
              )}
              <div className={classes.flexContainer}>
                <Autocomplete
                  onChange={(_, item) => {
                    setSelectedTransactionType(item);
                    pdfErrors.clear();
                    pdfLoading.clear();
                  }}
                  value={transactionTypeOptions.find(
                    (option) => option.value === selectedTransactionType.value
                  )}
                  className={classes.transactionType}
                  disableClearable
                  label="Transaction Types"
                  options={transactionTypeOptions}
                />
                <Autocomplete
                  onChange={(_, item) => {
                    setSelectedTransactionDate(item);
                    pdfErrors.clear();
                    pdfLoading.clear();
                  }}
                  value={transactionDateOptions.find(
                    (option) => option.value === selectedTransactionDate.value
                  )}
                  className={classes.transactionDate}
                  disableClearable
                  label="Transaction Dates"
                  options={transactionDateOptions}
                />
              </div>
            </div>
          </StyledBillingAndPaymentHistoryHeader>
        </div>
        <OrderBy
          data={
            selectedTransactionType.value === 'all'
              ? combinedData
              : filteredData
          }
          order={'desc'}
          orderBy={'date'}
        >
          {({ data: orderedData }) => (
            <Paginate data={orderedData} pageSize={25} shouldScroll={false}>
              {({
                count,
                data: paginatedAndOrderedData,
                handlePageChange,
                handlePageSizeChange,
                page,
                pageSize,
              }) => (
                <>
                  <Table aria-label="List of Invoices and Payments">
                    <TableHead>
                      <TableRow>
                        <TableCell className={classes.descriptionColumn}>
                          Description
                        </TableCell>
                        <TableCell className={classes.dateColumn}>
                          Date
                        </TableCell>
                        <TableCell className={classes.totalColumn}>
                          Amount
                        </TableCell>
                        <TableCell className={classes.pdfDownloadColumn} />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableContentWrapper
                        error={
                          accountPaymentsError || accountInvoicesError
                            ? [
                                {
                                  reason:
                                    'There was an error retrieving your billing activity.',
                                },
                              ]
                            : undefined
                        }
                        loading={
                          accountPaymentsLoading || accountInvoicesLoading
                        }
                        loadingProps={{
                          columns: 4,
                        }}
                        length={paginatedAndOrderedData.length}
                      >
                        {paginatedAndOrderedData.map((thisItem) => {
                          return (
                            <ActivityFeedItem
                              downloadPDF={
                                thisItem.type === 'invoice'
                                  ? downloadInvoicePDF
                                  : downloadPaymentPDF
                              }
                              hasError={pdfErrors.has(
                                `${thisItem.type}-${thisItem.id}`
                              )}
                              isLoading={pdfLoading.has(
                                `${thisItem.type}-${thisItem.id}`
                              )}
                              key={`${thisItem.type}-${thisItem.id}`}
                              {...thisItem}
                            />
                          );
                        })}
                      </TableContentWrapper>
                    </TableBody>
                  </Table>
                  <PaginationFooter
                    count={count}
                    eventCategory="Billing Activity Table"
                    handlePageChange={handlePageChange}
                    handleSizeChange={handlePageSizeChange}
                    page={page}
                    pageSize={pageSize}
                  />
                </>
              )}
            </Paginate>
          )}
        </OrderBy>
      </Paper>
    </Grid>
  );
});

const StyledBillingAndPaymentHistoryHeader = styled('div', {
  name: 'BillingAndPaymentHistoryHeader',
})(({ theme }) => ({
  border: theme.name === 'dark' ? `1px solid ${theme.borderColors.divider}` : 0,
  borderBottom: 0,
}));

// =============================================================================
// <ActivityFeedItem />
// =============================================================================
interface ActivityFeedItemProps extends ActivityFeedItem {
  downloadPDF: (id: number) => void;
  hasError: boolean;
  isLoading: boolean;
}

export const ActivityFeedItem = React.memo((props: ActivityFeedItemProps) => {
  const { classes } = useStyles();

  const {
    date,
    downloadPDF,
    hasError,
    id,
    isLoading,
    label,
    total,
    type,
  } = props;

  const handleClick = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      downloadPDF(id);
    },
    [id, downloadPDF]
  );

  const action = {
    className: hasError ? classes.pdfError : '',
    onClick: handleClick,
    title: hasError ? 'Error. Click to try again.' : 'Download PDF',
  };

  return (
    <TableRow data-testid={`${type}-${id}`}>
      <TableCell>
        {type === 'invoice' ? (
          <Link to={`/account/billing/invoices/${id}`}>{label}</Link>
        ) : (
          label
        )}
      </TableCell>
      <TableCell>
        <DateTimeDisplay value={date} />
      </TableCell>
      <TableCell className={classes.totalColumn}>
        <Currency quantity={total} wrapInParentheses={total < 0} />
      </TableCell>
      <TableCell className={classes.pdfDownloadColumn}>
        <InlineMenuAction
          actionText={action.title}
          className={action.className}
          loading={isLoading}
          onClick={action.onClick}
        />
      </TableCell>
    </TableRow>
  );
});

// =============================================================================
// Utilities
// =============================================================================
const getAllInvoiceItems = (invoiceId: number) =>
  getAll<InvoiceItem>((params, filter) =>
    getInvoiceItems(invoiceId, params, filter)
  )().then((data) => data.data);

export const invoiceToActivityFeedItem = (
  invoice: Invoice
): ActivityFeedItem => {
  return {
    ...invoice,
    type: 'invoice',
  };
};

export const paymentToActivityFeedItem = (
  payment: Payment
): ActivityFeedItem => {
  const { date, id, usd } = payment;
  // Refunds are issued as negative payments.
  const label = usd < 0 ? 'Refund' : `Payment #${payment.id}`;

  const total = Math.abs(usd);

  return {
    date,
    id,
    label,
    total,
    type: 'payment',
  };
};
/**
 * @param currentDatetime ISO format date
 * @returns ISO format beginning of the range date
 */
export const getCutoffFromDateRange = (
  range: TransactionDateOptions,
  currentDatetime?: string
): null | string => {
  if (range === transactionDateOptions[5]) {
    return null;
  }

  const date = currentDatetime ? parseAPIDate(currentDatetime) : DateTime.utc();

  let outputDate: DateTime;
  switch (range) {
    case transactionDateOptions[0]:
      outputDate = date.minus({ days: 30 });
      break;
    case transactionDateOptions[1]:
      outputDate = date.minus({ days: 60 });
      break;
    case transactionDateOptions[2]:
      outputDate = date.minus({ days: 90 });
      break;
    case transactionDateOptions[3]:
      outputDate = date.minus({ months: 6 });
      break;
    case transactionDateOptions[4]:
      outputDate = date.minus({ months: 12 });
      break;
    default:
      outputDate = DateTime.fromMillis(0, { zone: 'utc' });
      break;
  }
  return outputDate.startOf('day').toISO();
};

/**
 * @param endDate in ISO format
 */
export const makeFilter = (endDate: null | string) => {
  const filter: any = {
    '+order': 'desc',
    '+order_by': 'date',
  };
  if (endDate) {
    const filterEndDate = parseAPIDate(endDate);
    filter.date = {
      '+gte': filterEndDate.toFormat(ISO_DATETIME_NO_TZ_FORMAT),
    };
  }

  return filter;
};
