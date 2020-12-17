import { Kind, Kind2, Kind3, Kind4, URIS, URIS2, URIS3, URIS4 } from 'fp-ts/HKT'
import { Monad1, Monad2, Monad3, Monad4 } from 'fp-ts/lib/Monad'
import { IO } from 'fp-ts/lib/IO'

// SECTION Types

// MODULE Declarations

type Listener<P extends URIS> = (data?: any) => Kind<P, any>

type Listener2<P extends URIS2> = (data?: any) => Kind2<P, any, any>

type Listener3<P extends URIS3> = (data?: any) => Kind3<P, any, any, any>

type Listener4<P extends URIS4> = (data?: any) => Kind4<P, any, any, any, any>

export type Events<P extends URIS> = Record<string, Listener<P>>

export type Events2<P extends URIS2> = Record<string, Listener2<P>>

export type Events3<P extends URIS3> = Record<string, Listener3<P>>

export type Events4<P extends URIS4> = Record<string, Listener4<P>>

export type EventsAlgebra<P extends URIS, E extends Events<P>> = E

export type EventsAlgebra2<P extends URIS2, E extends Events2<P>> = E

export type EventsAlgebra3<P extends URIS3, E extends Events3<P>> = E

export type EventsAlgebra4<P extends URIS4, E extends Events4<P>> = E

// MODULE Algebras

export type RegisterEvent<P extends URIS, E extends Events<P>> =
  { on: <K extends keyof E>(event: K, listener: E[K]) => IO<symbol> }

export type UnregisterEvent = { off: (eventSymbol: symbol) => IO<boolean> }

export type EmitEvent<P extends URIS, E extends Events<P>> =
  { emit: <K extends keyof E>(event: K, ...data: Parameters<E[K]>) => ReturnType<E[K]> }

export type EventEmitter<P extends URIS, E extends Events<P>> =
  RegisterEvent<P, E> & UnregisterEvent & EmitEvent<P, E>

export type RegisterEvent2<P extends URIS2, E extends Events2<P>> =
  { on: <K extends keyof E>(event: K, listener: E[K]) => IO<symbol> }

export type EmitEvent2<P extends URIS2, E extends Events2<P>> =
  { emit: <K extends keyof E>(event: K, ...data: Parameters<E[K]>) => ReturnType<E[K]> }

export type EventEmitter2<P extends URIS2, E extends Events2<P>> =
  RegisterEvent2<P, E> & UnregisterEvent & EmitEvent2<P, E>

export type RegisterEvent3<P extends URIS3, E extends Events3<P>> =
  { on: <K extends keyof E>(event: K, listener: E[K]) => IO<symbol> }

export type EmitEvent3<P extends URIS3, E extends Events3<P>> =
  { emit: <K extends keyof E>(event: K, ...data: Parameters<E[K]>) => ReturnType<E[K]> }

export type EventEmitter3<P extends URIS3, E extends Events3<P>> =
  RegisterEvent3<P, E> & UnregisterEvent & EmitEvent3<P, E>

export type RegisterEvent4<P extends URIS4, E extends Events4<P>> =
  { on: <K extends keyof E>(event: K, listener: E[K]) => IO<symbol> }

export type EmitEvent4<P extends URIS4, E extends Events4<P>> =
  { emit: <K extends keyof E>(event: K, ...data: Parameters<E[K]>) => ReturnType<E[K]> }

export type EventEmitter4<P extends URIS4, E extends Events4<P>> =
  RegisterEvent4<P, E> & UnregisterEvent & EmitEvent4<P, E>

// SECTION Library

export function createEventEmitter<
  P extends URIS,
  E extends Events<P>,
  >(M: Monad1<P>): EventEmitter<P, E>

export function createEventEmitter<
  P extends URIS2,
  E extends Events2<P>,
  >(M: Monad2<P>): EventEmitter2<P, E>

export function createEventEmitter<
  P extends URIS3,
  E extends Events3<P>,
  >(M: Monad3<P>): EventEmitter3<P, E>

export function createEventEmitter<
  P extends URIS4,
  E extends Events4<P>,
  >(M: Monad4<P>): EventEmitter4<P, E>

export function createEventEmitter<
  P extends URIS,
  E extends Events<P> = {},
  >(M: Monad1<P>): EventEmitter<P, E> {

  const events = new Map<keyof E, Array<Listener<P>>>()

  const removeList = new Map<symbol, () => void>()

  const on: EventEmitter<P, E>['on'] = (event, listener) => () => {
    if (!events.has(event)) {
      events.set(event, new Array())
    }

    const listeners = events.get(event)

    if (listeners === undefined) { return false as never }

    listeners.push(listener)

    const symbol = Symbol('')

    removeList.set(symbol, () => {
      listeners.splice(listeners.indexOf(listener))
    })

    return symbol
  }

  const off: EventEmitter<P, E>['off'] = (eventSymbol) => () => {
    const remove = removeList.get(eventSymbol)

    if (remove === undefined) {
      return false
    }

    remove()

    return true
  }

  // @ts-ignore typescript limitation
  const emit: EventEmitter<P, E>['emit'] = (event, ...data) => {
    const listeners = events.get(event)

    const empty = M.of(undefined)

    if (listeners === undefined) {
      return empty
    }

    return listeners.reduce<Kind<P, any>>(
      (acc, listener) => M.chain(acc, () => listener(...data)),
      empty
    )
  }

  return { on, off, emit }
}
