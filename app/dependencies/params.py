from typing import Annotated

from fastapi import Depends

from errors.params import InvalidFilterError
from schemas.params import (
    FilterParams,
    TransactionFilterParams,
    TransactionSummaryFilterParams,
)

FilterParamsDep = Annotated[FilterParams, Depends()]


def get_transaction_filter_params(
    params: Annotated[TransactionFilterParams, Depends()],
) -> TransactionFilterParams:
    if (
        params.transaction_date_from is not None
        and params.transaction_date_to is not None
        and params.transaction_date_from > params.transaction_date_to
    ):
        raise InvalidFilterError(
            "transaction_date_from must be before transaction_date_to"
        )
    return params


TransactionFilterParamsDep = Annotated[
    TransactionFilterParams, Depends(get_transaction_filter_params)
]


def get_transaction_summary_filter_params(
    params: Annotated[TransactionSummaryFilterParams, Depends()],
) -> TransactionSummaryFilterParams:
    if (
        params.transaction_date_from is not None
        and params.transaction_date_to is not None
        and params.transaction_date_from > params.transaction_date_to
    ):
        raise InvalidFilterError(
            "transaction_date_from must be before transaction_date_to"
        )
    return params


TransactionSummaryFilterParamsDep = Annotated[
    TransactionSummaryFilterParams, Depends(get_transaction_summary_filter_params)
]
