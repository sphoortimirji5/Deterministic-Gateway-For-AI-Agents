import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import NodeCache = require('node-cache');

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
    private cache = new NodeCache({ stdTTL: 600 }); // 10 minute window

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const idempotencyKey = request.headers['x-idempotency-key'];

        if (!idempotencyKey) {
            return next.handle();
        }

        const cachedResponse = this.cache.get(idempotencyKey);
        if (cachedResponse) {
            return of(cachedResponse);
        }

        return next.handle().pipe(
            tap((response) => {
                this.cache.set(idempotencyKey, response);
            }),
        );
    }
}
